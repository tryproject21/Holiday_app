import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

const AppContext = createContext();

export function AppProvider({ children, tripId }) {
  const { profile } = useAuth();
  const [trip, setTrip] = useState(null);
  const [members, setMembers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activities, setActivities] = useState([]);
  const [checklistItems, setChecklistItems] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [plans, setPlans] = useState([]);
  const [planOptions, setPlanOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const subscriptionsRef = useRef([]);

  // ─── FETCH ALL DATA ──────────────────────────────────────
  const fetchAllData = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);

    const [tripRes, membersRes, txRes, actRes, checkRes, docRes, planRes] = await Promise.all([
      supabase.from('trips').select('*').eq('id', tripId).single(),
      supabase.from('trip_members').select('*, profiles(display_name, avatar_url)').eq('trip_id', tripId),
      supabase.from('transactions').select('*').eq('trip_id', tripId).order('created_at', { ascending: true }),
      supabase.from('activities').select('*').eq('trip_id', tripId).order('date').order('sort_order'),
      supabase.from('checklist_items').select('*').eq('trip_id', tripId).order('sort_order'),
      supabase.from('documents').select('*').eq('trip_id', tripId).order('created_at'),
      supabase.from('plans').select('*').eq('trip_id', tripId).order('created_at'),
    ]);

    if (tripRes.data) setTrip(tripRes.data);
    if (membersRes.data) setMembers(membersRes.data);
    if (txRes.data) setTransactions(txRes.data);
    if (actRes.data) setActivities(actRes.data);
    if (checkRes.data) setChecklistItems(checkRes.data);
    if (docRes.data) setDocuments(docRes.data);

    if (planRes.data) {
      setPlans(planRes.data);
      // Fetch all plan options for this trip's plans
      const planIds = planRes.data.map(p => p.id);
      if (planIds.length > 0) {
        const { data: opts } = await supabase
          .from('plan_options')
          .select('*')
          .in('plan_id', planIds)
          .order('created_at');
        if (opts) setPlanOptions(opts);
      }
    }

    setLoading(false);
  }, [tripId]);

  // ─── REALTIME SUBSCRIPTIONS ──────────────────────────────
  useEffect(() => {
    if (!tripId) return;
    fetchAllData();

    // Helper: create a channel for a table
    const subscribeTable = (table, setState, filter = `trip_id=eq.${tripId}`) => {
      const channel = supabase
        .channel(`${table}-${tripId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table, filter }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setState(prev => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setState(prev => prev.map(item => item.id === payload.new.id ? payload.new : item));
          } else if (payload.eventType === 'DELETE') {
            setState(prev => prev.filter(item => item.id !== payload.old.id));
          }
        })
        .subscribe();
      return channel;
    };

    const channels = [
      subscribeTable('transactions', setTransactions),
      subscribeTable('activities', setActivities),
      subscribeTable('checklist_items', setChecklistItems),
      subscribeTable('documents', setDocuments),
      subscribeTable('plans', setPlans),
      subscribeTable('trip_members', setMembers),
    ];

    // Trip updates (single row)
    const tripChannel = supabase
      .channel(`trips-${tripId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` }, (payload) => {
        setTrip(payload.new);
      })
      .subscribe();
    channels.push(tripChannel);

    // Plan options — listen to all, filter client-side
    const optChannel = supabase
      .channel(`plan_options-${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plan_options' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setPlanOptions(prev => [...prev, payload.new]);
        } else if (payload.eventType === 'UPDATE') {
          setPlanOptions(prev => prev.map(o => o.id === payload.new.id ? payload.new : o));
        } else if (payload.eventType === 'DELETE') {
          setPlanOptions(prev => prev.filter(o => o.id !== payload.old.id));
        }
      })
      .subscribe();
    channels.push(optChannel);

    subscriptionsRef.current = channels;

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [tripId, fetchAllData]);

  // ─── Derived: member names list (for compatibility with existing components) ──
  const memberNames = members.map(m => m.display_name);

  // ─── Derived: splitBills ──
  const splitBills = transactions.filter(t => t.is_split);

  // ─── TRIP ────────────────────────────────────────────────
  const updateBudget = async (newBudget) => {
    const { error } = await supabase
      .from('trips')
      .update({ budget: Number(newBudget) })
      .eq('id', tripId);
    if (error) console.error('updateBudget error:', error);
  };

  const resetTrip = async () => {
    if (!window.confirm('Reset semua data perjalanan? Data yang tersimpan akan hilang permanen.')) return;
    // Delete all trip data (cascade will handle related tables)
    await supabase.from('trips').delete().eq('id', tripId);
  };

  // ─── TRANSACTIONS ────────────────────────────────────────
  const addTransaction = async (t) => {
    const { error } = await supabase.from('transactions').insert({
      trip_id: tripId,
      type: t.type,
      category: t.category,
      amount: Number(t.amount),
      date: t.date,
      note: t.note,
      paid_by: t.paidBy,
      is_split: t.isSplit || false,
      split_type: t.splitType || null,
      split_among: t.splitAmong || null,
      custom_amounts: t.customAmounts || null,
      created_by: profile.id,
    });
    if (error) console.error('addTransaction error:', error);
  };

  const updateTransaction = async (id, updated) => {
    const { error } = await supabase.from('transactions').update({
      type: updated.type,
      category: updated.category,
      amount: Number(updated.amount),
      date: updated.date,
      note: updated.note,
      paid_by: updated.paidBy,
      is_split: updated.isSplit || false,
      split_type: updated.splitType || null,
      split_among: updated.splitAmong || null,
      custom_amounts: updated.customAmounts || null,
    }).eq('id', id);
    if (error) console.error('updateTransaction error:', error);
  };

  const deleteTransaction = async (id) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) console.error('deleteTransaction error:', error);
  };

  // ─── ACTIVITIES ──────────────────────────────────────────
  const addActivity = async (a) => {
    const { error } = await supabase.from('activities').insert({
      trip_id: tripId,
      date: a.date,
      time: a.time,
      description: a.description,
      location_name: a.locationName,
      maps_url: a.mapsUrl,
      lat: a.lat || null,
      lng: a.lng || null,
      sort_order: a.order || null,
      created_by: profile.id,
    });
    if (error) console.error('addActivity error:', error);
  };

  const updateActivity = async (id, updated) => {
    const { error } = await supabase.from('activities').update({
      date: updated.date,
      time: updated.time,
      description: updated.description,
      location_name: updated.locationName,
      maps_url: updated.mapsUrl,
      lat: updated.lat || null,
      lng: updated.lng || null,
      sort_order: updated.order !== undefined ? updated.order : null,
    }).eq('id', id);
    if (error) console.error('updateActivity error:', error);
  };

  const deleteActivity = async (id) => {
    const { error } = await supabase.from('activities').delete().eq('id', id);
    if (error) console.error('deleteActivity error:', error);
  };

  const reorderActivities = async (date, draggedId, targetId) => {
    // Get the current order for this date
    const dayActs = activities
      .filter(a => a.date === date)
      .sort((a, b) => {
        if (a.sort_order != null && b.sort_order != null) return a.sort_order - b.sort_order;
        return (a.time || '').localeCompare(b.time || '');
      });

    const draggedIndex = dayActs.findIndex(a => a.id === draggedId);
    const targetIndex = dayActs.findIndex(a => a.id === targetId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const [draggedItem] = dayActs.splice(draggedIndex, 1);
    dayActs.splice(targetIndex, 0, draggedItem);

    // Update sort_order for all items in this date
    const updates = dayActs.map((act, idx) => 
      supabase.from('activities').update({ sort_order: idx }).eq('id', act.id)
    );
    await Promise.all(updates);
  };

  // ─── CHECKLIST ───────────────────────────────────────────
  const addChecklistItem = async (text, category = 'Lainnya') => {
    const { error } = await supabase.from('checklist_items').insert({
      trip_id: tripId,
      text,
      category,
      done: false,
      sort_order: checklistItems.length,
      created_by: profile.id,
    });
    if (error) console.error('addChecklistItem error:', error);
  };

  const toggleChecklistItem = async (id) => {
    const item = checklistItems.find(i => i.id === id);
    if (!item) return;
    const { error } = await supabase
      .from('checklist_items')
      .update({ done: !item.done })
      .eq('id', id);
    if (error) console.error('toggleChecklistItem error:', error);
  };

  const updateChecklistItem = async (id, text, category) => {
    const { error } = await supabase
      .from('checklist_items')
      .update({ text, category })
      .eq('id', id);
    if (error) console.error('updateChecklistItem error:', error);
  };

  const deleteChecklistItem = async (id) => {
    const { error } = await supabase.from('checklist_items').delete().eq('id', id);
    if (error) console.error('deleteChecklistItem error:', error);
  };

  const reorderChecklistItems = async (startIndex, endIndex) => {
    const result = Array.from(checklistItems);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    // Update sort_order for reordered items
    const updates = result.map((item, idx) =>
      supabase.from('checklist_items').update({ sort_order: idx }).eq('id', item.id)
    );
    // Optimistic update
    setChecklistItems(result.map((item, idx) => ({ ...item, sort_order: idx })));
    await Promise.all(updates);
  };

  // ─── DOCUMENTS ───────────────────────────────────────────
  const addDocument = async (doc) => {
    let imagePath = null;

    // Upload image to Supabase Storage if provided
    if (doc.image) {
      const fileName = `${tripId}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      // Convert base64 to blob
      const response = await fetch(doc.image);
      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, blob);
      if (uploadError) {
        console.error('Upload error:', uploadError);
      } else {
        imagePath = fileName;
      }
    }

    const { error } = await supabase.from('documents').insert({
      trip_id: tripId,
      title: doc.title,
      type: doc.type,
      link: doc.link || null,
      image_path: imagePath,
      created_by: profile.id,
    });
    if (error) console.error('addDocument error:', error);
  };

  const deleteDocument = async (id) => {
    const doc = documents.find(d => d.id === id);
    // Delete from storage if exists
    if (doc?.image_path) {
      await supabase.storage.from('documents').remove([doc.image_path]);
    }
    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (error) console.error('deleteDocument error:', error);
  };

  // ─── PLANS ───────────────────────────────────────────────
  const addPlan = async (plan) => {
    const { error } = await supabase.from('plans').insert({
      trip_id: tripId,
      title: plan.title,
      category: plan.category,
      created_by: profile.id,
    });
    if (error) console.error('addPlan error:', error);
  };

  const deletePlan = async (id) => {
    const { error } = await supabase.from('plans').delete().eq('id', id);
    if (error) console.error('deletePlan error:', error);
  };

  const addPlanOption = async (planId, option) => {
    const { error } = await supabase.from('plan_options').insert({
      plan_id: planId,
      name: option.name,
      price: Number(option.price),
      note: option.note,
      is_selected: false,
    });
    if (error) console.error('addPlanOption error:', error);
  };

  const deletePlanOption = async (optionId) => {
    const { error } = await supabase.from('plan_options').delete().eq('id', optionId);
    if (error) console.error('deletePlanOption error:', error);
  };

  const selectPlanOption = async (planId, optionId) => {
    // Deselect all options in this plan, then select the one
    const opts = planOptions.filter(o => o.plan_id === planId);
    const updates = opts.map(o =>
      supabase.from('plan_options').update({ is_selected: o.id === optionId }).eq('id', o.id)
    );
    await Promise.all(updates);
  };

  // ─── COMPUTED ────────────────────────────────────────────
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const expenseByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
      return acc;
    }, {});

  const calculateDebts = () => {
    const balances = {};
    memberNames.forEach(m => { balances[m] = 0; });

    splitBills.forEach(bill => {
      const payer = bill.paid_by;
      const totalAmount = Number(bill.amount);

      if (bill.split_type === 'equal') {
        const perPerson = totalAmount / bill.split_among.length;
        bill.split_among.forEach(person => {
          if (person !== payer) {
            balances[person] = (balances[person] || 0) - perPerson;
            balances[payer] = (balances[payer] || 0) + perPerson;
          }
        });
      } else if (bill.split_type === 'custom') {
        Object.entries(bill.custom_amounts || {}).forEach(([person, amount]) => {
          if (person !== payer) {
            balances[person] = (balances[person] || 0) - Number(amount);
            balances[payer] = (balances[payer] || 0) + Number(amount);
          }
        });
      }
    });

    const debts = [];
    const debtors = Object.entries(balances).filter(([, v]) => v < 0).sort((a, b) => a[1] - b[1]);
    const creditors = Object.entries(balances).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);

    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const [debtor, debtAmount] = debtors[i];
      const [creditor, creditAmount] = creditors[j];
      const settleAmount = Math.min(-debtAmount, creditAmount);

      if (settleAmount > 0.01) {
        debts.push({ from: debtor, to: creditor, amount: Math.round(settleAmount) });
      }

      debtors[i] = [debtor, debtAmount + settleAmount];
      creditors[j] = [creditor, creditAmount - settleAmount];

      if (Math.abs(debtors[i][1]) < 0.01) i++;
      if (Math.abs(creditors[j][1]) < 0.01) j++;
    }

    return debts;
  };

  // ─── COMPATIBILITY LAYER ──────────────────────────────────
  // Map Supabase snake_case to camelCase for existing components
  const mappedActivities = activities.map(a => ({
    ...a,
    locationName: a.location_name,
    mapsUrl: a.maps_url,
    order: a.sort_order,
  }));

  const mappedTransactions = transactions.map(t => ({
    ...t,
    paidBy: t.paid_by,
    isSplit: t.is_split,
    splitType: t.split_type,
    splitAmong: t.split_among,
    customAmounts: t.custom_amounts,
  }));

  const mappedSplitBills = mappedTransactions.filter(t => t.isSplit);

  const mappedDocuments = documents.map(d => ({
    ...d,
    // Generate public URL for stored images
    image: d.image_path
      ? supabase.storage.from('documents').getPublicUrl(d.image_path).data.publicUrl
      : null,
  }));

  // Build plans with nested options for compatibility
  const mappedPlans = plans.map(p => ({
    ...p,
    options: planOptions
      .filter(o => o.plan_id === p.id)
      .map(o => ({ ...o, isSelected: o.is_selected })),
  }));

  // Construct trip object compatible with existing components
  const tripData = trip ? {
    ...trip,
    members: memberNames,
    isSetup: true,
  } : { name: '', destination: '', budget: 0, members: [], isSetup: false };

  const value = {
    trip: tripData,
    members,
    setupTrip: () => {}, // No-op, handled by TripSetup now
    updateBudget,
    resetTrip,
    transactions: mappedTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    activities: mappedActivities,
    addActivity,
    updateActivity,
    deleteActivity,
    reorderActivities,
    checklistItems,
    addChecklistItem,
    toggleChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
    reorderChecklistItems,
    splitBills: mappedSplitBills,
    documents: mappedDocuments,
    addDocument,
    deleteDocument,
    plans: mappedPlans,
    addPlan,
    deletePlan,
    addPlanOption,
    deletePlanOption,
    selectPlanOption,
    totalExpense,
    totalIncome,
    expenseByCategory,
    calculateDebts,
    loading,
    tripId,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  return useContext(AppContext);
}
