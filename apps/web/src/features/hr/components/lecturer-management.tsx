import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Calendar, Check, Edit, Plus, Trash2, Users } from 'lucide-react';

export function LecturerManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedLecturerId, setSelectedLecturerId] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<'view' | 'edit' | 'leave' | 'workload' | 'offerings' | null>(null);

  // Queries
  const { data: lecturers, isLoading: loadingLecturers } = useQuery({
    queryKey: ['hr', 'lecturers'],
    queryFn: async () => {
      const res = await fetch('/api/hr/lecturers');
      if (!res.ok) throw new Error('Failed to fetch lecturers');
      return res.json();
    }
  });

  const { data: lecturerDetails, isLoading: loadingLecturerDetails } = useQuery({
    queryKey: ['hr', 'lecturer', selectedLecturerId],
    queryFn: async () => {
      if (!selectedLecturerId) throw new Error('No lecturer selected');
      const res = await fetch(`/api/hr/lecturers/${selectedLecturerId}`);
      if (!res.ok) throw new Error('Failed to fetch lecturer details');
      return res.json();
    },
    enabled: !!selectedLecturerId
  });

  // Mutations
  const { mutate: updateLecturerMutate } = useMutation({
    mutationFn: async ({ lecturerId, data }: { lecturerId: string; data: Partial<any> }) => {
      const res = await fetch(`/api/hr/lecturers/${lecturerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update lecturer');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'lecturers'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'lecturer', selectedLecturerId] });
      toast({
        title: 'Lecturer updated',
        description: 'Lecturer information has been updated successfully.',
      });
      setSelectedAction(null);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update lecturer information.',
        variant: 'destructive',
      });
    }
  });

  const { mutate: deleteLecturerMutate } = useMutation({
    mutationFn: async (lecturerId: string) => {
      const res = await fetch(`/api/hr/lecturers/${lecturerId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete lecturer');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'lecturers'] });
      setSelectedLecturerId(null);
      setSelectedAction(null);
      toast({
        title: 'Lecturer deleted',
        description: 'Lecturer has been removed successfully.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete lecturer.',
        variant: 'destructive',
      });
    }
  });

  const handleViewLecturer = (lecturerId: string) => {
    setSelectedLecturerId(lecturerId);
    setSelectedAction('view');
  };

  const handleEditLecturer = (lecturerId: string) => {
    setSelectedLecturerId(lecturerId);
    setSelectedAction('edit');
  };

  const handleViewLeave = (lecturerId: string) => {
    setSelectedLecturerId(lecturerId);
    setSelectedAction('leave');
  };

  const handleViewWorkload = (lecturerId: string) => {
    setSelectedLecturerId(lecturerId);
    setSelectedAction('workload');
  };

  const handleViewOfferings = (lecturerId: string) => {
    setSelectedLecturerId(lecturerId);
    setSelectedAction('offerings');
  };

  const handleDeleteLecturer = (lecturerId: string) => {
    if (window.confirm('Are you sure you want to delete this lecturer? This action cannot be undone.')) {
      deleteLecturerMutate(lecturerId);
    }
  };

  const handleLecturerUpdate = (data: Partial<any>) => {
    if (selectedLecturerId) {
      updateLecturerMutate({ lecturerId: selectedLecturerId, data });
    }
  };

  if (loadingLecturers) {
    return <div className="p-6">Loading lecturers...</div>;
  }

  return (
    <div className="space-y-6">
      <Toaster />

      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Lecturer Management</h1>
          <p className="text-muted-foreground">Manage lecturer information, workload, leave records, and teaching assignments</p>
        </div>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" /> Add Lecturer
          </Button>
        </DialogTrigger>
      </div>

      {/* Lecturer List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-500" />
            <span>Lecturer Directory</span>
          </CardTitle>
          <Input
            placeholder="Search lecturers by name, ID, or department..."
            className="w-full max-w-xs"
          />
        </CardHeader>
        <CardContent>
          {!lecturers || lecturers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No lecturers found. Add lecturers to get started.
            </div>
          ) : (
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHeader className="w-20">Lecturer ID</TableHeader>
                  <TableHeader>Name</TableHeader>
                  <TableHeader className="w-32">Department</TableHeader>
                  <TableHeader className="w-20">Contract Type</TableHeader>
                  <TableHeader className="w-16">Status</TableHeader>
                  <TableHeader className="w-24">Actions</TableHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lecturers.map((lecturer: any) => (
                  <TableRow key={lecturer.id}>
                    <TableCell>{lecturer.employeeId || lecturer.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                          {lecturer.user?.name?.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium">{lecturer.user?.name}</div>
                          <div className="text-sm text-muted-foreground">{lecturer.user?.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{lecturer.department || 'Not Assigned'}</TableCell>
                    <TableCell>
                      <Badge variant={lecturer.contractType === 'Full-Time' ? 'default' : lecturer.contractType === 'Part-Time' ? 'secondary' : 'outline'}>
                        {lecturer.contractType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={lecturer.isActive ? 'success' : 'destructive'}>
                        {lecturer.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleViewLecturer(lecturer.id)}
                        aria-label="View lecturer"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleViewLeave(lecturer.id)}
                        aria-label="View leave records"
                      >
                        <Calendar className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleViewWorkload(lecturer.id)}
                        aria-label="View workload"
                      >
                        <BarChart className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDeleteLecturer(lecturer.id)}
                        aria-label="Delete lecturer"
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

      {/* Lecturer Details Panel */}
      {selectedLecturerId && selectedAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedAction === 'view' ? 'Lecturer Details' :
                 selectedAction === 'edit' ? 'Edit Lecturer' :
                 selectedAction === 'leave' ? 'Leave Management' :
                 selectedAction === 'workload' ? 'Workload Analysis' :
                 selectedAction === 'offerings' ? 'Teaching Assignments' : 'Lecturer Information'}
              </DialogTitle>
              <DialogDescription>
                Managing information for lecturer: {lecturerDetails?.user?.name || 'Loading...'}
              </DialogDescription>
            </DialogHeader>
            <DialogContent>
              <Separator className="mb-4" />
              {selectedAction === 'view' && lecturerDetails && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div>
                      <h2 className="font-semibold mb-2">Personal Information</h2>
                      <p><strong>Employee ID:</strong> {lecturerDetails.employeeId || lecturerDetails.id}</p>
                      <p><strong>Full Name:</strong> {lecturerDetails.user?.name}</p>
                      <p><strong>Email:</strong> {lecturerDetails.user?.email}</p>
                      <p><strong>Phone:</strong> {lecturerDetails.user?.phone || 'Not provided'}</p>
                      <p><strong>Date of Birth:</strong> {lecturerDetails.user?.dateOfBirth ? new Date(lecturerDetails.user?.dateOfBirth).toLocaleDateString() : 'Not provided'}</p>
                      <p><strong>Gender:</strong> {lecturerDetails.user?.gender || 'Not specified'}</p>
                    </div>
                    <div>
                      <h2 className="font-semibold mb-2">Employment Information</h2>
                      <p><strong>Department:</strong> {lecturerDetails.department || 'Not Assigned'}</p>
                      <p><strong>Faculty:</strong> {lecturerDetails.faculty?.name || 'Not Assigned'}</p>
                      <p><strong>Position:</strong> {lecturerDetails.position || 'Lecturer'}</p>
                      <p><strong>Contract Type:</strong> {lecturerDetails.contractType}</p>
                      <p><strong>Status:</strong>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${lecturerDetails.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {lecturerDetails.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </p>
                      <p><strong>Hire Date:</strong> {lecturerDetails.hireDate ? new Date(lecturerDetails.hireDate).toLocaleDateString() : 'Not provided'}</p>
                      <p><strong>Max Teaching Load:</strong> {lecturerDetails.maxTeachingLoad} credit hours</p>
                    </div>
                    <div>
                      <h2 className="font-semibold mb-2">Academic Qualifications</h2>
                      <p><strong>Highest Degree:</strong> {lecturerDetails.highestDegree || 'Not specified'}</p>
                      <p><strong>Field of Study:</strong> {lecturerDetails.fieldOfStudy || 'Not specified'}</p>
                      <p><strong>Institution:</strong> {lecturerDetails.graduationInstitution || 'Not specified'}</p>
                      <p><strong>Year of Graduation:</strong> {lecturerDetails.graduationYear || 'Not specified'}</p>
                      {lecturerDetails.certifications && lecturerDetails.certifications.length > 0 && (
                        <>
                          <p><strong>Certifications:</strong></p>
                          <ul className="list-disc pl-5 space-y-1">
                            {lecturerDetails.certifications.map((cert: string, index: number) => (
                              <li key={index}>{cert}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h2 className="font-semibold mb-4">Contact & Emergency Information</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <p><strong>Address:</strong> {lecturerDetails.address || 'Not provided'}</p>
                        <p><strong>City:</strong> {lecturerDetails.city || 'Not provided'}</p>
                        <p><strong>State/Province:</strong> {lecturerDetails.state || 'Not provided'}</p>
                        <p><strong>Postal Code:</strong> {lecturerDetails.postalCode || 'Not provided'}</p>
                        <p><strong>Country:</strong> {lecturerDetails.country || 'Not provided'}</p>
                      </div>
                      <div>
                        <p><strong>Emergency Contact:</strong> {lecturerDetails.emergencyContactName || 'Not provided'}</p>
                        <p><strong>Relationship:</strong> {lecturerDetails.emergencyContactRelationship || 'Not provided'}</p>
                        <p><strong>Phone:</strong> {lecturerDetails.emergencyContactPhone || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedAction === 'edit' && lecturerDetails && (
                <form className="space-y-6" onSubmit={(e) => {
                  e.preventDefault();
                  // Handle form submission
                }}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h2 className="font-semibold mb-2">Personal Information</h2>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Full Name</label>
                          <Input defaultValue={lecturerDetails.user?.name || ''} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Email</label>
                          <Input type="email" defaultValue={lecturerDetails.user?.email || ''} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Phone</label>
                          <Input type="tel" defaultValue={lecturerDetails.user?.phone || ''} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Date of Birth</label>
                            <Input type="date" defaultValue={lecturerDetails.user?.dateOfBirth ? new Date(lecturerDetails.user?.dateOfBirth).toISOString().split('T')[0] : ''} />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Gender</label>
                            <select defaultValue={lecturerDetails.user?.gender || ''} className="w-full px-3 py-2 border border-input rounded-md shadow-sm focus:border-primary focus:ring-primary disabled:opacity-50">
                              <option value="">Select Gender</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h2 className="font-semibold mb-2">Employment Information</h2>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Department</label>
                          <Input defaultValue={lecturerDetails.department || ''} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Faculty</label>
                          <Input defaultValue={lecturerDetails.faculty?.name || ''} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Position</label>
                            <Input defaultValue={lecturerDetails.position || ''} />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Contract Type</label>
                            <select defaultValue={lecturerDetails.contractType} className="w-full px-3 py-2 border border-input rounded-md shadow-sm focus:border-primary focus:ring-primary disabled:opacity-50">
                              <option value="Full-Time">Full-Time</option>
                              <option value="Part-Time">Part-Time</option>
                              <option value="Contract">Contract</option>
                              <option value="Visiting">Visiting</option>
                              <option value="Adjunct">Adjunct</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Hire Date</label>
                          <Input type="date" defaultValue={lecturerDetails.hireDate ? new Date(lecturerDetails.hireDate).toISOString().split('T')[0] : ''} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Max Teaching Load (credit hours)</label>
                          <Input type="number" defaultValue={lecturerDetails.maxTeachingLoad || 0} min="0" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <h2 className="font-semibold mb-2">Academic Qualifications</h2>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Highest Degree</label>
                          <select defaultValue={lecturerDetails.highestDegree || ''} className="w-full px-3 py-2 border border-input rounded-md shadow-sm focus:border-primary focus:ring-primary disabled:opacity-50">
                            <option value="">Select Degree</option>
                            <option value="PhD">PhD</option>
                            <option value="Master's">Master's</option>
                            <option value="Bachelor's">Bachelor's</option>
                            <option value="Diploma">Diploma</option>
                            <option value="Certificate">Certificate</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Field of Study</label>
                          <Input defaultValue={lecturerDetails.fieldOfStudy || ''} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Graduation Institution</label>
                          <Input defaultValue={lecturerDetails.graduationInstitution || ''} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Year of Graduation</label>
                          <Input type="number" defaultValue={lecturerDetails.graduationYear || 0} min="1900" max={new Date().getFullYear()} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Certifications (comma-separated)</label>
                          <Input defaultValue={lecturerDetails.certifications?.join(', ') || ''} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h2 className="font-semibold mb-4">Contact & Emergency Information</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-semibold mb-2">Contact Information</h3>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium mb-1">Address</label>
                            <Input defaultValue={lecturerDetails.address || ''} />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">City</label>
                            <Input defaultValue={lecturerDetails.city || ''} />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">State/Province</label>
                            <Input defaultValue={lecturerDetails.state || ''} />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Postal Code</label>
                            <Input defaultValue={lecturerDetails.postalCode || ''} />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Country</label>
                            <Input defaultValue={lecturerDetails.country || ''} />
                          </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Emergency Contact</h3>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium mb-1">Name</label>
                            <Input defaultValue={lecturerDetails.emergencyContactName || ''} />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Relationship</label>
                            <Input defaultValue={lecturerDetails.emergencyContactRelationship || ''} />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Phone</label>
                            <Input type="tel" defaultValue={lecturerDetails.emergencyContactPhone || ''} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              )}

              {selectedAction === 'leave' && lecturerDetails && (
                <div className="space-y-6">
                  <h2 className="font-semibold mb-4">Leave Records</h2>
                  {/* Leave records table would go here */}
                  <div className="text-center py-8 text-muted-foreground">
                    Leave management interface placeholder
                  </div>
                </div>
              )}

              {selectedAction === 'workload' && lecturerDetails && (
                <div className="space-y-6">
                  <h2 className="font-semibold mb-4">Workload Analysis</h2>
                  {/* Workload analysis would go here */}
                  <div className="text-center py-8 text-muted-foreground">
                    Workload analysis interface placeholder
                  </div>
                </div>
              )}

              {selectedAction === 'offerings' && lecturerDetails && (
                <div className="space-y-6">
                  <h2 className="font-semibold mb-4">Teaching Assignments</h2>
                  {/* Teaching offerings would go here */}
                  <div className="text-center py-8 text-muted-foreground">
                    Teaching assignments interface placeholder
                  </div>
                </div>
              )}
            </DialogContent>
            <DialogFooter>
              {selectedAction === 'edit' && (
                <>
                  <Button variant="outline" onClick={() => {
                    setSelectedAction(null);
                    setSelectedLecturerId(null);
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={() => {
                    // Handle form submission
                    setSelectedAction(null);
                    setSelectedLecturerId(null);
                  }}>
                    Save Changes
                  </Button>
                </>
              )}
              {(selectedAction === 'view' || selectedAction === 'leave' || selectedAction === 'workload' || selectedAction === 'offerings') && (
                <Button onClick={() => {
                  setSelectedAction(null);
                  setSelectedLecturerId(null);
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