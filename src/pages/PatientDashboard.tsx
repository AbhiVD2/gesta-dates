import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Heart, LogOut, Bell } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { calculateAllScans, calculateEDD } from '@/lib/pregnancyCalculator';
import { Badge } from '@/components/ui/badge';

interface PatientScan {
  id: string;
  lmp_date: string;
  edd_date: string;
}

interface ScanType {
  id: string;
  name: string;
  week_range_start: number;
  week_range_end: number;
}

export default function PatientDashboard() {
  const { user, signOut } = useAuth();
  const [patientScan, setPatientScan] = useState<PatientScan | null>(null);
  const [scanTypes, setScanTypes] = useState<ScanType[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setProfile(profileData);

      // Fetch patient scan
      const { data: scanData } = await supabase
        .from('patient_scans')
        .select('*')
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setPatientScan(scanData);

      // Fetch scan types
      const { data: typesData } = await supabase
        .from('scan_types')
        .select('*')
        .order('week_range_start');

      setScanTypes(typesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatedScans = patientScan && scanTypes.length > 0
    ? calculateAllScans(parseISO(patientScan.lmp_date), scanTypes)
    : [];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Heart className="mx-auto mb-4 h-12 w-12 animate-pulse text-primary" />
          <p className="text-muted-foreground">Loading your care schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/10 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Heart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Welcome, {profile?.full_name}</h1>
              <p className="text-sm text-muted-foreground">Your Pregnancy Journey</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!patientScan ? (
          <Card className="mx-auto max-w-2xl">
            <CardHeader>
              <CardTitle>No Pregnancy Schedule Yet</CardTitle>
              <CardDescription>
                Please contact your healthcare provider to set up your pregnancy care schedule.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Your Pregnancy Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">LMP Date</p>
                  <p className="text-lg font-semibold">
                    {format(parseISO(patientScan.lmp_date), 'dd-MMM-yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expected Due Date (EDD)</p>
                  <p className="text-lg font-semibold text-primary">
                    {format(parseISO(patientScan.edd_date), 'dd-MMM-yyyy')}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div>
              <h2 className="mb-4 text-2xl font-semibold">Your Scan Schedule</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {calculatedScans.map((scan, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{scan.scanName}</CardTitle>
                        <Badge variant="secondary">{scan.weekRange}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Recommended Date</p>
                        <p className="font-semibold text-primary">{scan.calculatedDate}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Appointment Window</p>
                        <p className="text-sm">{scan.dateRange}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
