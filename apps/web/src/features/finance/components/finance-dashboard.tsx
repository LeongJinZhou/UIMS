import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Bell, Calendar, Check, CreditCard, DollarSign, Edit, RefreshCw, TrendingUp, Users } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';

export function FinanceDashboard() {
  const { toast } = useToast();

  // Queries for finance data
  const { data: financeStats, isLoading: loadingStats } = useQuery({
    queryKey: ['finance', 'dashboard-stats'],
    queryFn: async () => {
      const res = await fetch('/api/finance/dashboard');
      if (!res.ok) throw new Error('Failed to fetch finance stats');
      return res.json();
    }
  });

  const { data: recentInvoices, isLoading: loadingInvoices } = useQuery({
    queryKey: ['finance', 'recent-invoices'],
    queryFn: async () => {
      const res = await fetch('/api/finance/invoices?limit=5&sort=createdAt:desc');
      if (!res.ok) throw new Error('Failed to fetch recent invoices');
      return res.json();
    }
  });

  const { data: overdueInvoices, isLoading: loadingOverdue } = useQuery({
    queryKey: ['finance', 'overdue-invoices'],
    queryFn: async () => {
      const res = await fetch('/api/finance/invoices?status=OVERDUE&limit=5');
      if (!res.ok) throw new Error('Failed to fetch overdue invoices');
      return res.json();
    }
  });

  const { data: pendingExpenses, isLoading: loadingExpenses } = useQuery({
    queryKey: ['finance', 'pending-expenses'],
    queryFn: async () => {
      const res = await fetch('/api/finance/expenses?status=PENDING&limit=5');
      if (!res.ok) throw new Error('Failed to fetch pending expenses');
      return res.json();
    }
  });

  const handleApproveExpense = async (expenseId: string) => {
    try {
      const res = await fetch(`/api/finance/expenses/${expenseId}/approve`, {
        method: 'PATCH',
      });

      if (!res.ok) throw new Error('Failed to approve expense');

      toast({
        title: 'Expense approved',
        description: 'The expense has been approved successfully.',
      });

      // Refetch pending expenses
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve expense.',
        variant: 'destructive',
      });
    }
  };

  const handleReimburseExpense = async (expenseId: string) => {
    try {
      const res = await fetch(`/api/finance/expenses/${expenseId}/reimburse`, {
        method: 'PATCH',
      });

      if (!res.ok) throw new Error('Failed to reimburse expense');

      toast({
        title: 'Expense reimbursed',
        description: 'The expense has been marked as reimbursed.',
      });

      // Refetch pending expenses
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reimburse expense.',
        variant: 'destructive',
      });
    }
  };

  if (loadingStats || loadingInvoices || loadingOverdue || loadingExpenses) {
    return <div className="p-6">Loading finance dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <Toaster />

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <span>Total Revenue</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {financeStats ? (
              <>
                <div className="text-sm font-medium text-muted-foreground">
                  This Academic Year
                </div>
                <div className="text-3xl font-bold">
                  MYR {financeStats.totalRevenue?.toLocaleString() ?? '0'}
                </div>

                <div className="text-sm font-medium text-muted-foreground">
                  Collection Rate
                </div>
                <div className="text-xl font-semibold">
                  {financeStats.collectionRate?.toFixed(1)}%
                </div>
              </>
            ) : (
              <div className="text-center py-4">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Total Expenses Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-red-500" />
              <span>Total Expenses</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {financeStats ? (
              <>
                <div className="text-sm font-medium text-muted-foreground">
                  This Academic Year
                </div>
                <div className="text-3xl font-bold text-red-600">
                  MYR {financeStats.totalExpenses?.toLocaleString() ?? '0'}
                </div>

                <div className="text-sm font-medium text-muted-foreground">
                  Budget Utilization
                </div>
                <div className="text-xl font-semibold">
                  {financeStats.budgetUtilizationRate?.toFixed(1)}%
                </div>
              </>
            ) : (
              <div className="text-center py-4">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Outstanding Balance Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span>Outstanding Balance</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {financeStats ? (
              <>
                <div className="text-sm font-medium text-muted-foreground">
                  Total Outstanding
                </div>
                <div className="text-2xl font-bold text-orange-600">
                  MYR {financeStats.totalOutstanding?.toLocaleString() ?? '0'}
                </div>

                <div className="text-sm font-medium text-muted-foreground">
                  Overdue Invoices
                </div>
                <div className="text-xl font-semibold">
                  {overdueInvoices?.length ?? 0}
                </div>
              </>
            ) : (
              <div className="text-center py-4">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Pending Expenses Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <span>Pending Expenses</span>
            </CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="outline" size="icon" aria-label="Actions">
                  <Bell className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={4}>
                <DropdownMenuItem onClick={() => handleApproveExpense(pendingExpenses[0]?.id)}>
                  Approve Oldest
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { /* refresh */ }}>
                  Refresh List
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingExpenses && pendingExpenses.length > 0 ? (
              pendingExpenses.map((expense: any) => (
                <div key={expense.id} className="p-3 border rounded">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{expense.incurredByUser?.name || 'Unknown User'}</div>
                      <div className="text-sm text-muted-foreground">
                        {expense.description.substring(0, 50)}{expense.description.length > 50 ? '...' : ''}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleApproveExpense(expense.id)}
                        aria-label="Approve expense"
                      >
                        <Check className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleReimburseExpense(expense.id)}
                        aria-label="Reimburse expense"
                      >
                        <RefreshCw className="h-4 w-4 text-blue-500" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 text-right">
                    <span className="text-xs font-medium">MYR {expense.amount.toLocaleString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No pending expenses
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span>Revenue Trend</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Revenue chart placeholder */}
            <div className="h-40">
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Revenue Chart Placeholder
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-500" />
              <span>Student Fee Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Fee distribution chart placeholder */}
            <div className="h-40">
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Fee Distribution Chart Placeholder
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-gray-500" />
              <span>Recent Invoices</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!recentInvoices || recentInvoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No recent invoices
              </div>
            ) : (
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHeader className="w-20">Invoice ID</TableHeader>
                    <TableHeader className="w-32">Student</TableHeader>
                    <TableHeader className="w-20">Amount</TableHeader>
                    <TableHeader className="w-20">Due Date</TableHeader>
                    <TableHeader className="w-16">Status</TableHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentInvoices.map((invoice: any) => (
                    <TableRow key={invoice.id}>
                      <TableCell>{invoice.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                            {invoice.student?.user?.name?.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium">{invoice.student?.user?.name}</div>
                            <div className="text-sm text-muted-foreground">{invoice.student?.studentId}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">MYR {invoice.totalAmount.toLocaleString()}</TableCell>
                      <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge
                          variant={invoice.status === 'PAID' ? 'success' :
                                invoice.status === 'OVERDUE' ? 'destructive' :
                                invoice.status === 'PARTIAL' ? 'warning' : 'secondary'}
                        >
                          {invoice.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span>Overdue Invoices</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!overdueInvoices || overdueInvoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No overdue invoices
              </div>
            ) : (
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHeader className="w-20">Invoice ID</TableHeader>
                    <TableHeader className="w-32">Student</TableHeader>
                    <TableHeader className="w-20">Amount</TableHeader>
                    <TableHeader className="w-20">Days Overdue</TableHeader>
                    <TableHeader className="w-16">Actions</TableHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueInvoices.map((invoice: any) => {
                    const dueDate = new Date(invoice.dueDate);
                    const today = new Date();
                    const daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell>{invoice.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                              {invoice.student?.user?.name?.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium">{invoice.student?.user?.name}</div>
                              <div className="text-sm text-muted-foreground">{invoice.student?.studentId}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium text-red-600">MYR {invoice.balance.toLocaleString()}</TableCell>
                        <TableCell className="text-red-600 font-medium">{daysOverdue} days</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => { /* navigate to invoice details */ }}
                            aria-label="View invoice"
                          >
                            <Edit className="h-4 w-4 text-blue-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}