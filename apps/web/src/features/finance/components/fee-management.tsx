import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Check, Edit, Plus, Trash2, Users, DollarSign } from 'lucide-react';

export function FeeManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedFeeId, setSelectedFeeId] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<'view' | 'edit' | null>(null);

  // Filters
  const [feeTypeFilter, setFeeTypeFilter] = useState<string>('');
  const [programmeFilter, setProgrammeFilter] = useState<string>('');

  // Queries
  const { data: fees, isLoading: loadingFees } = useQuery({
    queryKey: ['finance', 'fees', feeTypeFilter, programmeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (feeTypeFilter) params.append('feeType', feeTypeFilter);
      if (programmeFilter) params.append('programmeId', programmeFilter);

      const res = await fetch(`/api/finance/fees?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch fees');
      return res.json();
    }
  });

  const { data: feeDetails, isLoading: loadingFeeDetails } = useQuery({
    queryKey: ['finance', 'fee', selectedFeeId],
    queryFn: async () => {
      if (!selectedFeeId) throw new Error('No fee selected');
      const res = await fetch(`/api/finance/fees/${selectedFeeId}`);
      if (!res.ok) throw new Error('Failed to fetch fee details');
      return res.json();
    },
    enabled: !!selectedFeeId
  });

  // Mutations
  const { mutate: createFeeMutate } = useMutation({
    mutationFn: async (feeData: any) => {
      const res = await fetch('/api/finance/fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feeData),
      });
      if (!res.ok) throw new Error('Failed to create fee');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'fees'] });
      toast({
        title: 'Fee created',
        description: 'Fee record has been created successfully.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create fee record.',
        variant: 'destructive',
      });
    }
  });

  const { mutate: updateFeeMutate } = useMutation({
    mutationFn: async ({ feeId, data }: { feeId: string; data: Partial<any> }) => {
      const res = await fetch(`/api/finance/fees/${feeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update fee');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'fees'] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'fee', selectedFeeId] });
      toast({
        title: 'Fee updated',
        description: 'Fee record has been updated successfully.',
      });
      setSelectedAction(null);
      setSelectedFeeId(null);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update fee record.',
        variant: 'destructive',
      });
    }
  });

  const { mutate: deleteFeeMutate } = useMutation({
    mutationFn: async (feeId: string) => {
      const res = await fetch(`/api/finance/fees/${feeId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete fee');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'fees'] });
      setSelectedFeeId(null);
      setSelectedAction(null);
      toast({
        title: 'Fee deleted',
        description: 'Fee record has been deleted successfully.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete fee record.',
        variant: 'destructive',
      });
    }
  });

  const handleViewFee = (feeId: string) => {
    setSelectedFeeId(feeId);
    setSelectedAction('view');
  };

  const handleEditFee = (feeId: string) => {
    setSelectedFeeId(feeId);
    setSelectedAction('edit');
  };

  const handleDeleteFee = (feeId: string) => {
    if (window.confirm('Are you sure you want to delete this fee? This action cannot be undone.')) {
      deleteFeeMutate(feeId);
    }
  };

  const handleFeeUpdate = (data: Partial<any>) => {
    if (selectedFeeId) {
      updateFeeMutate({ feeId: selectedFeeId, data });
    }
  };

  const handleCreateFee = (feeData: any) => {
    createFeeMutate(feeData);
  };

  if (loadingFees) {
    return <div className="p-6">Loading fees...</div>;
  }

  return (
    <div className="space-y-6">
      <Toaster />

      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Fee Management</h1>
          <p className="text-muted-foreground">Manage student fees, fee types, and fee structures</p>
        </div>
        <div className="flex space-x-3">
          <DialogTrigger asChild>
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" /> Add Fee
            </Button>
          </DialogTrigger>
          <Button variant="outline" onClick={() => /* export functionality */}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-blue-500" />
            <span>Filter Fees</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Fee Type</label>
              <select
                value={feeTypeFilter}
                onChange={(e) => setFeeTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md shadow-sm focus:border-primary focus:ring-primary disabled:opacity-50"
              >
                <option value="">All Fee Types</option>
                <option value="TUITION">Tuition</option>
                <option value="REGISTRATION">Registration</option>
                <option value="EXAMINATION">Examination</option>
                <option value="LABORATORY">Laboratory</option>
                <option value="LIBRARY">Library</option>
                <option value="SPORTS">Sports</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Programme</label>
              <select
                value={programmeFilter}
                onChange={(e) => setProgrammeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md shadow-sm focus:border-primary focus:ring-primary disabled:opacity-50"
              >
                <option value="">All Programmes</option>
                <option value="COMP_SCI">Computer Science</option>
                <option value="BUSINESS">Business Administration</option>
                <option value="ENGINEERING">Engineering</option>
                <option value="MEDICINE">Medicine</option>
                <option value="LAW">Law</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={() => {
                // Reset filters
                setFeeTypeFilter('');
                setProgrammeFilter('');
              }} className="btn-link p-1">
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fees List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-500" />
            <span>Fee Records</span>
          </CardTitle>
          <Input
            placeholder="Search fees by student ID, name, or description..."
            className="w-full max-w-xs"
          />
        </CardHeader>
        <CardContent>
          {!fees || fees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No fees found matching the current filters.
            </div>
          ) : (
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHeader className="w-20">Student ID</TableHeader>
                  <TableHeader>Student Name</TableHeader>
                  <TableHeader className="w-20">Fee Type</TableHeader>
                  <TableHeader className="w-20">Amount</TableHeader>
                  <TableHeader className="w-20">Semester</TableHeader>
                  <TableHeader className="w-16">Status</TableHeader>
                  <TableHeader className="w-24">Actions</TableHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fees.map((fee: any) => (
                  <TableRow key={fee.id}>
                    <TableCell>{fee.student?.studentId}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                          {fee.student?.user?.name?.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium">{fee.student?.user?.name}</div>
                          <div className="text-sm text-muted-foreground">{fee.student?.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{fee.feeType}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">MYR {fee.amount.toLocaleString()}</TableCell>
                    <TableCell>{fee.semester?.label || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={fee.status === 'PAID' ? 'success' :
                              fee.status === 'PARTIAL' ? 'warning' :
                              fee.status === 'OVERDUE' ? 'destructive' : 'secondary'}
                      >
                        {fee.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleViewFee(fee.id)}
                        aria-label="View fee"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => /* navigate to payment */ }
                        aria-label="Process payment"
                      >
                        <CreditCard className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDeleteFee(fee.id)}
                        aria-label="Delete fee"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Fee Details Panel */}
      {selectedFeeId && selectedAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedAction === 'view' ? 'Fee Details' : 'Edit Fee'}
              </DialogTitle>
              <DialogDescription>
                Managing fee record for: {feeDetails?.student?.user?.name || 'Loading...'}
              </DialogDescription>
            </DialogHeader>
            <DialogContent>
              <Divider className="mb-4" />
              {selectedAction === 'view' && feeDetails && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h2 className="font-semibold mb-2">Student Information</h2>
                      <p><strong>Student ID:</strong> {feeDetails.student?.studentId}</p>
                      <p><strong>Full Name:</strong> {feeDetails.student?.user?.name}</p>
                      <p><strong>Programme:</strong> {feeDetails.student?.programme?.name}</p>
                      <p><strong>Current Semester:</strong> {feeDetails.student?.currentSemester}</p>
                      <p><strong>Email:</strong> {feeDetails.student?.user?.email}</p>
                      <p><strong>Phone:</strong> {feeDetails.student?.user?.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <h2 className="font-semibold mb-2">Fee Details</h2>
                      <p><strong>Fee ID:</strong> {feeDetails.id}</p>
                      <p><strong>Fee Type:</strong> {feeDetails.feeType}</p>
                      <p><strong>Amount:</strong> <span className="font-mono text-lg">MYR {feeDetails.amount.toLocaleString()}</span></p>
                      <p><strong>Description:</strong> {feeDetails.description}</p>
                      <p><strong>Semester:</strong> {feeDetails.semester?.label || 'Not specified'}</p>
                      <p><strong>Credit Hours:</strong> {feeDetails.creditHours || 'N/A'}</p>
                      <p><strong>Status:</strong>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${feeDetails.status === 'PAID' ? 'bg-green-100 text-green-800' :
                                feeDetails.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                                feeDetails.status === 'OVERDUE' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                          {feeDetails.status}
                        </span>
                      </p>
                      <p><strong>Created Date:</strong> {feeDetails.createdAt ? new Date(feeDetails.createdAt).toLocaleString() : 'N/A'}</p>
                      <p><strong>Updated Date:</strong> {feeDetails.updatedAt ? new Date(feeDetails.updatedAt).toLocaleString() : 'N/A'}</p>
                    </div>
                  </div>

                  {feeDetails.invoice && (
                    <div className="border-t pt-4">
                      <h2 className="font-semibold mb-4">Associated Invoice</h2>
                      <div className="space-y-3">
                        <p><strong>Invoice ID:</strong> {feeDetails.invoice.id}</p>
                        <p><strong>Invoice Number:</strong> {feeDetails.invoice.invoiceNumber}</p>
                        <p><strong>Total Amount:</strong> MYR {feeDetails.invoice.totalAmount.toLocaleString()}</p>
                        <p><strong>Paid Amount:</strong> MYR {feeDetails.invoice.paidAmount.toLocaleString()}</p>
                        <p><strong>Balance:</strong> MYR {feeDetails.invoice.balance.toLocaleString()}</p>
                        <p><strong>Due Date:</strong> {feeDetails.invoice.dueDate ? new Date(feeDetails.invoice.dueDate).toLocaleDateString() : 'N/A'}</p>
                        <p><strong>Status:</strong>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${feeDetails.invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
                                  feeDetails.invoice.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                                  feeDetails.invoice.status === 'OVERDUE' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                          {feeDetails.invoice.status}
                        </span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedAction === 'edit' && feeDetails && (
                <form className="space-y-6" onSubmit={(e) => {
                  e.preventDefault();
                  // Handle form submission
                }}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h2 className="font-semibold mb-2">Fee Information</h2>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Fee Type</label>
                          <select defaultValue={feeDetails.feeType} className="w-full px-3 py-2 border border-input rounded-md shadow-sm focus:border-primary focus:ring-primary disabled:opacity-50">
                            <option value="TUITION">Tuition</option>
                            <option value="REGISTRATION">Registration</option>
                            <option value="EXAMINATION">Examination</option>
                            <option value="LABORATORY">Laboratory</option>
                            <option value="LIBRARY">Library</option>
                            <option value="SPORTS">Sports</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Amount (MYR)</label>
                          <Input type="number" defaultValue={feeDetails.amount} min="0" step="0.01" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Description</label>
                          <Input defaultValue={feeDetails.description} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Credit Hours</label>
                          <Input type="number" defaultValue={feeDetails.creditHours || 0} min="0" />
                        </div>
                        <div className="mt-4">
                          <label className="block text-sm font-medium mb-1">Semester</label>
                          <select disabled className="w-full px-3 py-2 border border-input rounded-md shadow-sm">
                            <option value={feeDetails.semester?.id || ''}>
                              {feeDetails.semester?.label || 'Not specified'}
                            </option>
                          </select>
                          <p className="text-sm text-muted-foreground mt-1">
                            Semester cannot be changed after fee creation
                          </p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h2 className="font-semibold mb-2">Student Information (Read-only)</h2>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Student ID</label>
                          <Input defaultValue={feeDetails.student?.studentId} readOnly />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Full Name</label>
                          <Input defaultValue={feeDetails.student?.user?.name} readOnly />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Programme</label>
                          <Input defaultValue={feeDetails.student?.programme?.name} readOnly />
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              )}
            </DialogContent>
            <DialogFooter>
              {selectedAction === 'edit' && (
                <>
                  <Button variant="outline" onClick={() => {
                    setSelectedAction(null);
                    setSelectedFeeId(null);
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={() => {
                    // Handle form submission
                    setSelectedAction(null);
                    setSelectedFeeId(null);
                  }}>
                    Save Changes
                  </Button>
                </>
              )}
              {(selectedAction === 'view') && (
                <Button onClick={() => {
                  setSelectedAction(null);
                  setSelectedFeeId(null);
                }}>
                  Close
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </div>
      )}
    </div>
  );
}