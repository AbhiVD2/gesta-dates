import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LogOut, Plus, Users, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { calculateEDD } from '@/lib/pregnancyCalculator';

export default function AdminDashboard() {
  const { signOut, userRole } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  
  // New patient form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Scan form
  const [lmpDate, setLmpDate] = useState('');
  
  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    const { data } = await supabase
      .from('profiles')
      .select(`
        *,
        user_roles!inner(role),
        patient_scans(*)
      `)
      .eq('user_roles.role', 'patient');
    
    setPatients(data || []);
  };

  const createPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, phone }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        await supabase.from('profiles').insert({
          id: authData.user.id,
          full_name: fullName,
          phone: phone || null
        });

        await supabase.from('user_roles').insert({
          user_id: authData.user.id,
          role: 'patient'
        });

        toast.success('Patient created successfully!');
        setOpen(false);
        fetchPatients();
        setEmail('');
        setPassword('');
        setFullName('');
        setPhone('');
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const addScanSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPatient || !lmpDate) {
      toast.error('Please select patient and LMP date');
      return;
    }

    try {
      const lmp = parseISO(lmpDate);
      const edd = calculateEDD(lmp);

      const { error } = await supabase.from('patient_scans').insert({
        patient_id: selectedPatient,
        lmp_date: lmpDate,
        edd_date: format(edd, 'yyyy-MM-dd')
      });

      if (error) throw error;

      toast.success('Scan schedule created!');
      setScanOpen(false);
      fetchPatients();
      setLmpDate('');
      setSelectedPatient('');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/10 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">{userRole === 'superadmin' ? 'Super Admin' : 'Admin'} Dashboard</h1>
              <p className="text-sm text-muted-foreground">Manage patients and schedules</p>
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
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Patient
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Patient</DialogTitle>
                <DialogDescription>Add a new patient to the system</DialogDescription>
              </DialogHeader>
              <form onSubmit={createPatient} className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full">Create Patient</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={scanOpen} onOpenChange={setScanOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Calendar className="mr-2 h-4 w-4" />
                Add Scan Schedule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Scan Schedule</DialogTitle>
                <DialogDescription>Set LMP date for patient</DialogDescription>
              </DialogHeader>
              <form onSubmit={addScanSchedule} className="space-y-4">
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
                  <Input type="date" value={lmpDate} onChange={(e) => setLmpDate(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full">Create Schedule</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Patients</CardTitle>
            <CardDescription>Manage patient records and schedules</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {patients.map((patient) => (
                <Card key={patient.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{patient.full_name}</p>
                        <p className="text-sm text-muted-foreground">{patient.phone || 'No phone'}</p>
                      </div>
                      <div className="text-right">
                        {patient.patient_scans?.length > 0 ? (
                          <>
                            <p className="text-sm text-muted-foreground">LMP</p>
                            <p className="text-sm font-medium">
                              {format(parseISO(patient.patient_scans[0].lmp_date), 'dd-MMM-yyyy')}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">No schedule set</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
