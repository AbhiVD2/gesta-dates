import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LogOut, Plus, Calendar, Edit2, Trash2, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { calculateEDD } from '@/lib/pregnancyCalculator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function ScanPage() {
  const { signOut, userRole, user } = useAuth();
  const [scans, setScans] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedScan, setSelectedScan] = useState<any>(null);

  // Form state for creating/editing
  const [selectedPatient, setSelectedPatient] = useState('');
  const [lmpDate, setLmpDate] = useState('');
  const [auaWeeks, setAuaWeeks] = useState('');
  const [correctedLmp, setCorrectedLmp] = useState('');

  useEffect(() => {
    if (userRole && user) {
      fetchPatients();
      fetchScans();
    }
  }, [userRole, user]);

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, created_by')
        .eq('created_by', user?.id);

      if (error) throw error;
      setPatients(data || []);
    } catch (error: any) {
      console.error('Error fetching patients:', error.message);
      setPatients([]);
    }
  };

  const fetchScans = async () => {
    try {
      // First get all patient scans
      const { data: scansData, error: scansError } = await supabase
        .from('patient_scans')
        .select('*')
        .order('created_at', { ascending: false });

      if (scansError) throw scansError;

      if (!scansData || scansData.length === 0) {
        setScans([]);
        return;
      }

      // Get patient IDs
      const patientIds = [...new Set(scansData.map((s: any) => s.patient_id))];

      // Fetch patient profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, created_by')
        .in('id', patientIds);

      if (profilesError) throw profilesError;

      // Combine data and filter by admin's patients if admin/subadmin
      let combined = scansData.map((scan: any) => ({
        ...scan,
        patient: profilesData?.find((p: any) => p.id === scan.patient_id) || null,
      }));

      // Filter scans to only show those belonging to patients created by current user
      if (userRole && user && userRole !== 'superadmin') {
        combined = combined.filter((c: any) => c.patient?.created_by === user?.id);
      }

      setScans(combined);
    } catch (error: any) {
      console.error('Error fetching scans:', error.message);
      setScans([]);
    }
  };

  const createScan = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatient || !lmpDate) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const lmp = parseISO(lmpDate);
      const edd = calculateEDD(lmp);

      const { error } = await supabase.from('patient_scans').insert({
        patient_id: selectedPatient,
        lmp_date: lmpDate,
        edd_date: format(edd, 'yyyy-MM-dd'),
        aua_weeks: auaWeeks ? parseInt(auaWeeks) : null,
        corrected_lmp: correctedLmp || null,
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success('Scan created successfully!');
      setOpenCreate(false);
      resetForm();
      fetchScans();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const updateScan = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedScan || !lmpDate) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const lmp = parseISO(lmpDate);
      const edd = calculateEDD(lmp);

      const { error } = await supabase
        .from('patient_scans')
        .update({
          lmp_date: lmpDate,
          edd_date: format(edd, 'yyyy-MM-dd'),
          aua_weeks: auaWeeks ? parseInt(auaWeeks) : null,
          corrected_lmp: correctedLmp || null,
        })
        .eq('id', selectedScan.id);

      if (error) throw error;

      toast.success('Scan updated successfully!');
      setOpenEdit(false);
      resetForm();
      fetchScans();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const deleteScan = async (scanId: string) => {
    if (!window.confirm('Are you sure you want to delete this scan?')) return;

    try {
      const { error } = await supabase
        .from('patient_scans')
        .delete()
        .eq('id', scanId);

      if (error) throw error;

      toast.success('Scan deleted successfully!');
      fetchScans();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const resetForm = () => {
    setSelectedPatient('');
    setLmpDate('');
    setAuaWeeks('');
    setCorrectedLmp('');
    setSelectedScan(null);
  };

  const openEditDialog = (scan: any) => {
    setSelectedScan(scan);
    setLmpDate(scan.lmp_date);
    setAuaWeeks(scan.aua_weeks || '');
    setCorrectedLmp(scan.corrected_lmp || '');
    setOpenEdit(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setOpenCreate(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/10 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Stethoscope className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Scan Management</h1>
              <p className="text-sm text-muted-foreground">Manage patient ultrasound scans</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex gap-4">
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Create Scan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Scan</DialogTitle>
                <DialogDescription>Add a new scan for a patient</DialogDescription>
              </DialogHeader>
              <form onSubmit={createScan} className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Patient</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    value={selectedPatient}
                    onChange={(e) => setSelectedPatient(e.target.value)}
                    required
                  >
                    <option value="">Choose patient...</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>{p.full_name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>LMP Date</Label>
                  <Input
                    type="date"
                    value={lmpDate}
                    onChange={(e) => setLmpDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>AUA Weeks (Sequence)</Label>
                  <Input
                    type="number"
                    value={auaWeeks}
                    onChange={(e) => setAuaWeeks(e.target.value)}
                    placeholder="e.g., 20"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Corrected LMP</Label>
                  <Input
                    type="date"
                    value={correctedLmp}
                    onChange={(e) => setCorrectedLmp(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full">Create Scan</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              All Scans
            </CardTitle>
            <CardDescription>View and manage patient scan records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>LMP Date</TableHead>
                    <TableHead>EDD Date</TableHead>
                    <TableHead>AUA Weeks</TableHead>
                    <TableHead>Corrected LMP</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No scans found
                      </TableCell>
                    </TableRow>
                  ) : (
                    scans.map((scan) => (
                      <TableRow key={scan.id}>
                        <TableCell className="font-medium">{scan.patient?.full_name || 'Unknown'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(parseISO(scan.lmp_date), 'dd-MMM-yyyy')}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(parseISO(scan.edd_date), 'dd-MMM-yyyy')}
                        </TableCell>
                        <TableCell className="text-center">
                          {scan.aua_weeks ? (
                            <span className="inline-flex items-center justify-center bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium">
                              {scan.aua_weeks}w
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {scan.corrected_lmp ? format(parseISO(scan.corrected_lmp), 'dd-MMM-yyyy') : '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(parseISO(scan.created_at), 'dd-MMM-yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(scan)}
                            >
                              <Edit2 className="h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteScan(scan.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Edit Scan Dialog */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Scan</DialogTitle>
            <DialogDescription>
              Update scan information for {selectedScan?.patient?.full_name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={updateScan} className="space-y-4">
            <div className="space-y-2">
              <Label>LMP Date</Label>
              <Input
                type="date"
                value={lmpDate}
                onChange={(e) => setLmpDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>AUA Weeks (Sequence)</Label>
              <Input
                type="number"
                value={auaWeeks}
                onChange={(e) => setAuaWeeks(e.target.value)}
                placeholder="e.g., 20"
              />
            </div>
            <div className="space-y-2">
              <Label>Corrected LMP</Label>
              <Input
                type="date"
                value={correctedLmp}
                onChange={(e) => setCorrectedLmp(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full">Update Scan</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
