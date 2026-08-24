import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

const defaultTrip = {
  name: '',
  destination: '',
  budget: 0,
  members: [],
  isSetup: false,
};

const loadFromStorage = (key, fallback) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
};

const saveToStorage = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export function AppProvider({ children }) {
  const [trip, setTrip] = useState(() => loadFromStorage('trip', defaultTrip));
  const [transactions, setTransactions] = useState(() => {
    const txs = loadFromStorage('transactions', []);
    const oldSplits = loadFromStorage('splitBills', []);
    if (oldSplits && oldSplits.length > 0) {
      const migrated = oldSplits.map(b => ({
        id: b.id || Date.now() + Math.random(),
        type: 'expense',
        category: 'Split Bill',
        date: new Date().toISOString().split('T')[0],
        note: b.description,
        amount: b.amount,
        paidBy: b.paidBy,
        isSplit: true,
        splitType: b.splitType,
        splitAmong: b.splitAmong,
        customAmounts: b.customAmounts
      }));
      localStorage.removeItem('splitBills');
      return [...txs, ...migrated];
    }
    return txs;
  });
  const [activities, setActivities] = useState(() => {
    const acts = loadFromStorage('activities', []);
    // Reset order to fix the bug where activities were always appended to the end instead of sorted by time.
    return acts.map(a => ({ ...a, order: undefined }));
  });
  const [checklistItems, setChecklistItems] = useState(() => loadFromStorage('checklist', []));
  const [documents, setDocuments] = useState(() => loadFromStorage('documents', []));
  const [plans, setPlans] = useState(() => loadFromStorage('plans', []));

  const splitBills = transactions.filter(t => t.isSplit);

  // Persist to localStorage on every change
  useEffect(() => { saveToStorage('trip', trip); }, [trip]);
  useEffect(() => { saveToStorage('transactions', transactions); }, [transactions]);
  useEffect(() => { saveToStorage('activities', activities); }, [activities]);
  useEffect(() => { saveToStorage('checklist', checklistItems); }, [checklistItems]);
  useEffect(() => { saveToStorage('documents', documents); }, [documents]);
  useEffect(() => { saveToStorage('plans', plans); }, [plans]);

  // Trip setup
  const setupTrip = (name, destination, budget, members) => {
    setTrip({ name, destination, budget: Number(budget), members, isSetup: true });
  };

  const updateBudget = (newBudget) => {
    setTrip(prev => ({ ...prev, budget: Number(newBudget) }));
  };

  const resetTrip = () => {
    setTrip(defaultTrip);
    setTransactions([]);
    setActivities([]);
    setChecklistItems([]);
    setDocuments([]);
    setPlans([]);
  };

  // Transactions (Ledger)
  const addTransaction = (t) => {
    setTransactions(prev => [...prev, { ...t, id: Date.now() }]);
  };
  const updateTransaction = (id, updated) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updated } : t));
  };
  const deleteTransaction = (id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const addActivity = (a) => {
    setActivities(prev => {
      // Clear manual orders for this date so the new item seamlessly sorts by time
      const resetOrders = prev.map(x => x.date === a.date ? { ...x, order: undefined } : x);
      return [...resetOrders, { ...a, id: Date.now() }];
    });
  };
  const updateActivity = (id, updated) => {
    setActivities(prev => {
      const act = prev.find(x => x.id === id);
      if (act && act.time !== updated.time) {
        // If time changed, reset orders to resort chronologically
        return prev.map(x => x.date === act.date ? (x.id === id ? { ...x, ...updated, order: undefined } : { ...x, order: undefined }) : x);
      }
      return prev.map(a => a.id === id ? { ...a, ...updated } : a);
    });
  };
  const deleteActivity = (id) => {
    setActivities(prev => prev.filter(a => a.id !== id));
  };
  const reorderActivities = (date, draggedId, targetId) => {
    setActivities(prev => {
      // Get all activities for this date
      const dayActs = prev.filter(a => a.date === date).sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
        return (a.time || '').localeCompare(b.time || '');
      });
      
      const draggedIndex = dayActs.findIndex(a => a.id === draggedId);
      const targetIndex = dayActs.findIndex(a => a.id === targetId);
      
      if (draggedIndex === -1 || targetIndex === -1) return prev;
      
      // Move the item
      const [draggedItem] = dayActs.splice(draggedIndex, 1);
      dayActs.splice(targetIndex, 0, draggedItem);
      
      // Reassign sequential orders
      const updatedDayActs = dayActs.map((act, idx) => ({ ...act, order: idx }));
      
      // Merge back into main array
      return prev.map(a => {
        if (a.date === date) {
          return updatedDayActs.find(ua => ua.id === a.id) || a;
        }
        return a;
      });
    });
  };

  // Checklist
  const addChecklistItem = (text, category = 'Lainnya') => {
    setChecklistItems(prev => [...prev, { id: Date.now(), text, category, done: false }]);
  };
  const toggleChecklistItem = (id) => {
    setChecklistItems(prev => prev.map(item => item.id === id ? { ...item, done: !item.done } : item));
  };
  const updateChecklistItem = (id, text, category) => {
    setChecklistItems(prev => prev.map(item => item.id === id ? { ...item, text, category } : item));
  };
  const deleteChecklistItem = (id) => {
    setChecklistItems(prev => prev.filter(item => item.id !== id));
  };
  const reorderChecklistItems = (startIndex, endIndex) => {
    setChecklistItems(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  };



  // Documents
  const addDocument = (doc) => {
    setDocuments(prev => [...prev, { ...doc, id: Date.now() }]);
  };
  const deleteDocument = (id) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  // Plans
  const addPlan = (plan) => {
    setPlans(prev => [...prev, { ...plan, id: Date.now(), options: [] }]);
  };
  const deletePlan = (id) => {
    setPlans(prev => prev.filter(p => p.id !== id));
  };
  const addPlanOption = (planId, option) => {
    setPlans(prev => prev.map(p => {
      if (p.id !== planId) return p;
      return { ...p, options: [...p.options, { ...option, id: Date.now(), isSelected: false }] };
    }));
  };
  const deletePlanOption = (planId, optionId) => {
    setPlans(prev => prev.map(p => {
      if (p.id !== planId) return p;
      return { ...p, options: p.options.filter(o => o.id !== optionId) };
    }));
  };
  const selectPlanOption = (planId, optionId) => {
    setPlans(prev => prev.map(p => {
      if (p.id !== planId) return p;
      const newOptions = p.options.map(o => ({ ...o, isSelected: o.id === optionId }));
      return { ...p, options: newOptions };
    }));
  };

  // Computed values
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

  // Calculate debts from split bills
  const calculateDebts = () => {
    const balances = {};
    trip.members.forEach(m => { balances[m] = 0; });

    splitBills.forEach(bill => {
      const payer = bill.paidBy;
      const totalAmount = Number(bill.amount);

      if (bill.splitType === 'equal') {
        const perPerson = totalAmount / bill.splitAmong.length;
        bill.splitAmong.forEach(person => {
          if (person !== payer) {
            balances[person] = (balances[person] || 0) - perPerson;
            balances[payer] = (balances[payer] || 0) + perPerson;
          }
        });
      } else if (bill.splitType === 'custom') {
        Object.entries(bill.customAmounts || {}).forEach(([person, amount]) => {
          if (person !== payer) {
            balances[person] = (balances[person] || 0) - Number(amount);
            balances[payer] = (balances[payer] || 0) + Number(amount);
          }
        });
      }
    });

    // Simplify debts
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

  const value = {
    trip, setupTrip, updateBudget, resetTrip,
    transactions, addTransaction, updateTransaction, deleteTransaction,
    activities, addActivity, updateActivity, deleteActivity, reorderActivities,
    checklistItems, addChecklistItem, toggleChecklistItem, updateChecklistItem, deleteChecklistItem, reorderChecklistItems,
    splitBills,
    documents, addDocument, deleteDocument,
    plans, addPlan, deletePlan, addPlanOption, deletePlanOption, selectPlanOption,
    totalExpense, totalIncome, expenseByCategory, calculateDebts,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  return useContext(AppContext);
}
