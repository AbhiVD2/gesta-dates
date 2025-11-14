import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LogOut, Plus, Users, Calendar, Shield, Power, Trash2, CreditCard } from 'lucide-react';
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

export default function AdminDashboard() {
  const { signOut, userRole, user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [adminStats, setAdminStats] = useState<{ [key: string]: { subadmins: number; patients: number } }>({});
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [patientSchedules, setPatientSchedules] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  
  // New patient form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Scan form
  const [lmpDate, setLmpDate] = useState('');

  // Admin form
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  
  // Subscription Plan form
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [planPrice, setPlanPrice] = useState('');
  const [planDurationDays, setPlanDurationDays] = useState('');
  const [planFeatures, setPlanFeatures] = useState('');

  // Subscription form
  const [selectedAdmin, setSelectedAdmin] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [subscriptionStartDate, setSubscriptionStartDate] = useState('');
  const [autoRenew, setAutoRenew] = useState(true);
  
  useEffect(() => {
    fetchPatients();
    if (userRole === 'superadmin') {
      fetchAdmins();
      fetchSubscriptionPlans();
      fetchSubscriptions();
    }
    // Fetch patient schedules for admin and subadmin users
    if (userRole && user && userRole !== 'superadmin') {
      fetchPatientSchedules();
    }
  }, [userRole]);

  useEffect(() => {
    if (admins.length > 0) {
      admins.forEach(async (admin) => {
        const stats = await getAdminStats(admin.id);
        setAdminStats(prev => ({ ...prev, [admin.id]: stats }));
      });
    }
  }, [admins]);

  // Ensure patients are fresh when opening the Add Scan dialog
  useEffect(() => {
    if (scanOpen) {
      fetchPatients();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanOpen]);

  const fetchPatients = async () => {
    try {
      // First get the user IDs that have the 'patient' role
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'patient');

      if (rolesError) throw rolesError;

      if (!rolesData || rolesData.length === 0) {
        setPatients([]);
        return;
      }

      const userIds = rolesData.map((r: any) => r.user_id);

      // Fetch profiles and their scans for those user IDs
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*, patient_scans(*)')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      setPatients(profilesData || []);
    } catch (error: any) {
      console.error('Error fetching patients:', error?.message || error);
      setPatients([]);
    }
  };

  const fetchAdmins = async () => {
    try {
      // First fetch admin_status records
      const { data: adminStatusData, error: statusError } = await supabase
        .from('admin_status')
        .select('*');

      if (statusError) throw statusError;

      if (!adminStatusData || adminStatusData.length === 0) {
        setAdmins([]);
        return;
      }

      // Get user IDs from admin_status
      const userIds = adminStatusData.map((item: any) => item.user_id);

      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Fetch user roles for these users
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .in('user_id', userIds);

      if (rolesError) throw rolesError;

      // Combine data
      const transformedData = adminStatusData.map((statusItem: any) => {
        const profile = profilesData?.find((p: any) => p.id === statusItem.user_id);
        const roles = rolesData?.filter((r: any) => r.user_id === statusItem.user_id);

        return {
          id: statusItem.user_id,
          full_name: profile?.full_name || 'Unknown',
          phone: profile?.phone || null,
          created_at: profile?.created_at,
          created_by: profile?.created_by,
          admin_status: [{ is_active: statusItem.is_active }],
          user_roles: roles || []
        };
      });

      setAdmins(transformedData);
    } catch (error: any) {
      console.error('Error fetching admins:', error.message);
      setAdmins([]);
    }
  };

  const getAdminStats = async (adminId: string) => {
    try {
      // Get count of subadmins managed by this admin
      const { count: subadminCount } = await supabase
        .from('user_roles')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', adminId)
        .eq('role', 'subadmin');

      // Get count of active patients managed by this admin
      const { count: patientCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', adminId);

      return {
        subadmins: subadminCount || 0,
        patients: patientCount || 0
      };
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      return { subadmins: 0, patients: 0 };
    }
  };

  const fetchPatientSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('patient_scans')
        .select('*')
        .order('aua_weeks', { ascending: true })
        .order('edd_date', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        setPatientSchedules([]);
        return;
      }

      const patientIds = [...new Set(data.map((d: any) => d.patient_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, created_by')
        .in('id', patientIds);

      let combined = data.map((d: any) => ({
        ...d,
        patient: profilesData?.find((p: any) => p.id === d.patient_id) || null,
      }));

      // For admin/subadmin, filter schedules to those related to the current user where possible
      if (userRole && user && userRole !== 'superadmin') {
        combined = combined.filter((c: any) => {
          // Prefer profile.created_by or patient_scans.created_by
          const patientCreatedBy = c.patient?.created_by;
          if (patientCreatedBy) return patientCreatedBy === user.id;
          if (c.created_by) return c.created_by === user.id;
          // fallback: include the schedule if no owner info
          return true;
        });
      }

      setPatientSchedules(combined);
    } catch (error: any) {
      console.error('Error fetching patient schedules:', error.message || error);
      setPatientSchedules([]);
    }
  };

  const fetchSubscriptionPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;
      setSubscriptionPlans(data || []);
    } catch (error: any) {
      console.error('Error fetching subscription plans:', error.message);
      setSubscriptionPlans([]);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const { data: subsData, error: subsError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('is_active', true);

      if (subsError) throw subsError;

      // Enrich subscription data with admin and plan info
      if (subsData && subsData.length > 0) {
        const adminIds = [...new Set(subsData.map((s: any) => s.admin_id))];
        const planIds = [...new Set(subsData.map((s: any) => s.plan_id))];

        const { data: adminsData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', adminIds);

        const { data: plansData } = await supabase
          .from('subscription_plans')
          .select('id, name, price')
          .in('id', planIds);

        const enrichedData = subsData.map((sub: any) => ({
          ...sub,
          admin: adminsData?.find((a: any) => a.id === sub.admin_id),
          plan: plansData?.find((p: any) => p.id === sub.plan_id)
        }));

        setSubscriptions(enrichedData);
      } else {
        setSubscriptions([]);
      }
    } catch (error: any) {
      console.error('Error fetching subscriptions:', error.message);
      setSubscriptions([]);
    }
  };

  const createSubscriptionPlan = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!planName || !planPrice || !planDurationDays) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const features = planFeatures
        .split(',')
        .map((f: string) => f.trim())
        .filter((f: string) => f.length > 0);

      const { error } = await supabase.from('subscription_plans').insert({
        name: planName,
        description: planDescription || null,
        price: parseFloat(planPrice),
        duration_days: parseInt(planDurationDays),
        features: features,
        is_active: true
      });

      if (error) throw error;

      toast.success('Subscription plan created successfully!');
      setPlanOpen(false);
      fetchSubscriptionPlans();
      setPlanName('');
      setPlanDescription('');
      setPlanPrice('');
      setPlanDurationDays('');
      setPlanFeatures('');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const createSubscription = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAdmin || !selectedPlan || !subscriptionStartDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const plan = subscriptionPlans.find((p: any) => p.id === selectedPlan);
      if (!plan) {
        toast.error('Selected plan not found');
        return;
      }

      const startDate = new Date(subscriptionStartDate);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + plan.duration_days);

      const { error } = await supabase.from('subscriptions').insert({
        admin_id: selectedAdmin,
        plan_id: selectedPlan,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        is_active: true,
        auto_renew: autoRenew
      });

      if (error) throw error;

      toast.success('Subscription created successfully!');
      setSubscriptionOpen(false);
      fetchSubscriptions();
      setSelectedAdmin('');
      setSelectedPlan('');
      setSubscriptionStartDate('');
      setAutoRenew(true);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const deleteSubscription = async (subscriptionId: string) => {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ is_active: false })
        .eq('id', subscriptionId);

      if (error) throw error;

      toast.success('Subscription deleted successfully!');
      fetchSubscriptions();
    } catch (error: any) {
      toast.error(error.message);
    }
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

      // In some Supabase setups the signUp flow requires email confirmation and
      // `authData.user` may be null until the user confirms. Handle that case
      // gracefully and inform the admin to check the user's email.
      if (!authData?.user) {
        toast.success('Sign-up initiated. The user may need to confirm their email before the account is active.');
        setOpen(false);
        // clear form
        setEmail('');
        setPassword('');
        setFullName('');
        setPhone('');
        return;
      }

      if (authData.user) {
        await supabase.from('profiles').insert({
          id: authData.user.id,
          full_name: fullName,
          phone: phone || null,
          email: email || null,
          // set created_by to the current admin's user id so admin ownership is tracked
          created_by: user?.id || null
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
      const msg = (error && (error.message || error.error_description || error.msg)) || (typeof error === 'string' ? error : JSON.stringify(error));
      console.error('createPatient error', error);
      toast.error(String(msg));
    }
  };

  const createAdmin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (userRole !== 'superadmin') {
      toast.error('Only superadmins can create admins');
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
        options: {
          data: { full_name: adminName, phone: adminPhone }
        }
      });

      if (authError) throw authError;

      if (!authData?.user) {
        toast.success('Sign-up initiated. The admin may need to confirm their email before the account is active.');
        setAdminOpen(false);
        setAdminEmail('');
        setAdminPassword('');
        setAdminName('');
        setAdminPhone('');
        return;
      }

      if (authData.user) {
        await supabase.from('profiles').insert({
          id: authData.user.id,
          full_name: adminName,
          phone: adminPhone || null
        });

        await supabase.from('user_roles').insert({
          user_id: authData.user.id,
          role: 'admin'
        });

        // Create admin status entry
        await supabase.from('admin_status').insert({
          user_id: authData.user.id,
          is_active: true
        });

        toast.success('Admin created successfully!');
        setAdminOpen(false);
        fetchAdmins();
        setAdminEmail('');
        setAdminPassword('');
        setAdminName('');
        setAdminPhone('');
      }
    } catch (error: any) {
      const msg = (error && (error.message || error.error_description || error.msg)) || (typeof error === 'string' ? error : JSON.stringify(error));
      console.error('createAdmin error', error);
      toast.error(String(msg));
    }
  };

  const toggleAdminStatus = async (adminId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('admin_status')
        .update({ is_active: !currentStatus })
        .eq('user_id', adminId);

      if (error) throw error;

      toast.success(`Admin ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
      fetchAdmins();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const deleteAdmin = async (adminId: string) => {
    try {
      // Delete admin status
      await supabase
        .from('admin_status')
        .delete()
        .eq('user_id', adminId);

      // Delete user role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', adminId);

      // Delete profile
      await supabase
        .from('profiles')
        .delete()
        .eq('id', adminId);

      toast.success('Admin deleted successfully!');
      fetchAdmins();
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
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-xl font-semibold truncate">{userRole === 'superadmin' ? 'Super Admin' : 'Admin'} Dashboard</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Manage patients and schedules</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="flex-shrink-0">
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-8">
        {/* Admin Management Section - Only for Superadmins */}
        {userRole === 'superadmin' && (
          <div className="mb-6 sm:mb-8">
            <div className="mb-4 sm:mb-6">
              <Dialog open={adminOpen} onOpenChange={setAdminOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-teal-600 hover:bg-teal-700 w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Admin
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Admin</DialogTitle>
                    <DialogDescription>Add a new admin to the system</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={createAdmin} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input value={adminPhone} onChange={(e) => setAdminPhone(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required />
                    </div>
                    <Button type="submit" className="w-full">Create Admin</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
                  Admin Management
                </CardTitle>
                <CardDescription className="text-sm">Manage admins and their status</CardDescription>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                <div className="rounded-lg border overflow-x-auto -mx-3 sm:mx-0">
                  <Table className="text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Sub-admin</TableHead>
                        <TableHead>Active Patient</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {admins.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8 text-sm">
                            No admins yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        admins.map((admin) => {
                          const isActive = admin.admin_status?.[0]?.is_active ?? true;
                          const stats = adminStats[admin.id] || { subadmins: 0, patients: 0 };
                          return (
                            <TableRow key={admin.id}>
                              <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">{admin.full_name}</TableCell>
                              <TableCell className="text-xs sm:text-sm whitespace-nowrap">{admin.phone || '-'}</TableCell>
                              <TableCell>
                                <div className={`inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap ${
                                  isActive 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                }`}>
                                  <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-600' : 'bg-red-600'}`} />
                                  {isActive ? 'Active' : 'Inactive'}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {format(parseISO(admin.created_at), 'dd-MMM-yyyy')}
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="inline-flex items-center justify-center bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium">
                                  {stats.subadmins}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="inline-flex items-center justify-center bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 px-3 py-1 rounded-full text-sm font-medium">
                                  {stats.patients}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => toggleAdminStatus(admin.id, isActive)}
                                  >
                                    <Power className="h-4 w-4" />
                                    {isActive ? 'Deactivate' : 'Activate'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => deleteAdmin(admin.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Subscription Management Section - Only for Superadmins */}
        {userRole === 'superadmin' && (
          <div className="mb-8">
            <div className="mb-6 flex gap-4">
              <Dialog open={planOpen} onOpenChange={setPlanOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Plan
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Subscription Plan</DialogTitle>
                    <DialogDescription>Create a new subscription plan</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={createSubscriptionPlan} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Plan Name</Label>
                      <Input value={planName} onChange={(e) => setPlanName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input value={planDescription} onChange={(e) => setPlanDescription(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Price ($)</Label>
                      <Input type="number" step="0.01" value={planPrice} onChange={(e) => setPlanPrice(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Duration (Days)</Label>
                      <Input type="number" value={planDurationDays} onChange={(e) => setPlanDurationDays(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Features (comma-separated)</Label>
                      <Input value={planFeatures} onChange={(e) => setPlanFeatures(e.target.value)} placeholder="Feature 1, Feature 2, Feature 3" />
                    </div>
                    <Button type="submit" className="w-full">Create Plan</Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={subscriptionOpen} onOpenChange={setSubscriptionOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Assign Subscription
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Assign Subscription</DialogTitle>
                    <DialogDescription>Assign a subscription plan to an admin</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={createSubscription} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Select Admin</Label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                        value={selectedAdmin}
                        onChange={(e) => setSelectedAdmin(e.target.value)}
                        required
                      >
                        <option value="">Choose admin...</option>
                        {admins.map((a) => (
                          <option key={a.id} value={a.id}>{a.full_name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Select Plan</Label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                        value={selectedPlan}
                        onChange={(e) => setSelectedPlan(e.target.value)}
                        required
                      >
                        <option value="">Choose plan...</option>
                        {subscriptionPlans.map((p) => (
                          <option key={p.id} value={p.id}>{p.name} (${p.price})</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input type="date" value={subscriptionStartDate} onChange={(e) => setSubscriptionStartDate(e.target.value)} required />
                    </div>
                    <div className="space-y-2 flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="autoRenew" 
                        checked={autoRenew} 
                        onChange={(e) => setAutoRenew(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="autoRenew" className="mb-0 cursor-pointer">Auto-renew subscription</Label>
                    </div>
                    <Button type="submit" className="w-full">Assign Subscription</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Subscription Management
                </CardTitle>
                <CardDescription>Manage subscription plans and admin subscriptions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Subscription Plans Section */}
                <div>
                  <h3 className="font-semibold mb-4">Available Plans</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subscriptionPlans.length === 0 ? (
                      <p className="text-muted-foreground">No subscription plans created yet</p>
                    ) : (
                      subscriptionPlans.map((plan) => (
                        <Card key={plan.id} className="border-2">
                          <CardContent className="pt-6">
                            <div className="space-y-3">
                              <div>
                                <h4 className="font-semibold text-lg">{plan.name}</h4>
                                <p className="text-sm text-muted-foreground">{plan.description}</p>
                              </div>
                              <div>
                                <p className="text-2xl font-bold">₹{plan.price}</p>
                                <p className="text-sm text-muted-foreground">{plan.duration_days} days</p>
                              </div>
                              {plan.features && plan.features.length > 0 && (
                                <div className="space-y-1">
                                  {plan.features.map((feature: string, idx: number) => (
                                    <p key={idx} className="text-sm text-muted-foreground">✓ {feature}</p>
                                  ))}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>

                {/* Active Subscriptions Section */}
                <div>
                  <h3 className="font-semibold mb-4">Active Subscriptions</h3>
                  <div className="rounded-lg border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Admin</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Start Date</TableHead>
                          <TableHead>End Date</TableHead>
                          <TableHead>Auto-Renew</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subscriptions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                              No active subscriptions
                            </TableCell>
                          </TableRow>
                        ) : (
                          subscriptions.map((sub) => (
                            <TableRow key={sub.id}>
                              <TableCell className="font-medium">{sub.admin?.full_name || 'Unknown'}</TableCell>
                              <TableCell>{sub.plan?.name || 'Unknown'}</TableCell>
                              <TableCell>₹{sub.plan?.price || '0'}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {format(parseISO(sub.start_date), 'dd-MMM-yyyy')}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {format(parseISO(sub.end_date), 'dd-MMM-yyyy')}
                              </TableCell>
                              <TableCell>
                                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                  sub.auto_renew ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                }`}>
                                  {sub.auto_renew ? 'Yes' : 'No'}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => deleteSubscription(sub.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Cancel
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        {userRole !== 'superadmin' && (
          <>
            <Card className="mb-6 bg-primary/20 border-primary/40">
              <CardHeader>
                <CardTitle>Patients Schedule</CardTitle>
                <CardDescription>Upcoming scan schedules (ordered by sequence and EDD)</CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ minHeight: 280, maxHeight: 672 }} className="overflow-y-auto">
                  {patientSchedules.length === 0 ? (
                    <p className="text-muted-foreground p-4">No upcoming schedules</p>
                  ) : (
                    <div>
                      {patientSchedules.map((s: any) => (
                        <div key={s.id} className="flex items-center justify-between border-b py-3 px-2">
                          <div className="w-1/12 text-sm font-medium">{s.aua_weeks ?? '-'}</div>
                          <div className="w-5/12">{s.patient?.full_name || 'Unknown'}</div>
                          <div className="w-2/12 text-sm text-muted-foreground">{s.lmp_date ? format(parseISO(s.lmp_date), 'dd-MMM-yyyy') : '-'}</div>
                          <div className="w-2/12 text-sm text-muted-foreground">{s.edd_date ? format(parseISO(s.edd_date), 'dd-MMM-yyyy') : '-'}</div>
                          <div className="w-2/12 text-right text-sm">{s.is_active ? 'Scheduled' : 'Inactive'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

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
          </>
        )}
      </main>
    </div>
  );
}
