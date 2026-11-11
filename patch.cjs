const fs = require('fs');
const content = fs.readFileSync('src/components/dashboard/ExecutiveDashboard.tsx', 'utf8');

const target = `  // Financial Metrics Calculation
  const totalCash = bankAccounts.reduce((acc, b) => acc + b.balance, 0);
  const totalSalesRevenue = salesInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
  const totalSalesPaid = salesInvoices.filter(i => i.status === 'paid').reduce((acc, inv) => acc + inv.paidAmount, 0);
  const totalInventoryValuation = inventory.reduce((acc, item) => acc + (item.stockQty * item.unitCost), 0);
  const totalPipelineDeals = leads.filter(l => l.stage !== 'lost').reduce((acc, l) => acc + l.dealValue, 0);
  const totalProcurementSpend = purchaseOrders.reduce((acc, po) => acc + po.totalCost, 0);
  const totalBudgetSpent = budgetAllocations.reduce((acc, b) => acc + b.spentAmount, 0);
  const totalBudgetAllocated = budgetAllocations.reduce((acc, b) => acc + b.allocatedAmount, 0);
  const lowStockItems = inventory.filter(i => i.stockQty <= i.minStockLevel);
  const currentMonthInflows = cashTransactions.filter(t => t.type === 'inflow').reduce((sum, t) => sum + t.amount, 0);
  const currentMonthOutflows = cashTransactions.filter(t => t.type === 'outflow').reduce((sum, t) => sum + t.amount, 0);
  const currentMonthProfit = currentMonthInflows - currentMonthOutflows;`;

const replacement = `  // Financial Metrics Calculation
  const { totalCash, totalSalesRevenue, totalSalesPaid, totalInventoryValuation, totalPipelineDeals, totalProcurementSpend, totalBudgetSpent, totalBudgetAllocated, lowStockItems, currentMonthInflows, currentMonthOutflows, currentMonthProfit } = React.useMemo(() => {
    const inflows = cashTransactions.filter(t => t.type === 'inflow').reduce((sum, t) => sum + t.amount, 0);
    const outflows = cashTransactions.filter(t => t.type === 'outflow').reduce((sum, t) => sum + t.amount, 0);
    return {
      totalCash: bankAccounts.reduce((acc, b) => acc + b.balance, 0),
      totalSalesRevenue: salesInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0),
      totalSalesPaid: salesInvoices.filter(i => i.status === 'paid').reduce((acc, inv) => acc + inv.paidAmount, 0),
      totalInventoryValuation: inventory.reduce((acc, item) => acc + (item.stockQty * item.unitCost), 0),
      totalPipelineDeals: leads.filter(l => l.stage !== 'lost').reduce((acc, l) => acc + l.dealValue, 0),
      totalProcurementSpend: purchaseOrders.reduce((acc, po) => acc + po.totalCost, 0),
      totalBudgetSpent: budgetAllocations.reduce((acc, b) => acc + b.spentAmount, 0),
      totalBudgetAllocated: budgetAllocations.reduce((acc, b) => acc + b.allocatedAmount, 0),
      lowStockItems: inventory.filter(i => i.stockQty <= i.minStockLevel),
      currentMonthInflows: inflows,
      currentMonthOutflows: outflows,
      currentMonthProfit: inflows - outflows
    };
  }, [bankAccounts, salesInvoices, inventory, leads, purchaseOrders, budgetAllocations, cashTransactions]);`;

if (content.includes(target)) {
  fs.writeFileSync('src/components/dashboard/ExecutiveDashboard.tsx', content.replace(target, replacement));
  console.log("Patched successfully");
} else {
  console.log("Target not found");
}
