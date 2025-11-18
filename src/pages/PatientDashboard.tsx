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
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
              <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm sm:text-xl font-semibold truncate">Welcome, {profile?.full_name}</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Your Pregnancy Journey</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="flex-shrink-0">
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-8">
        {!patientScan ? (
          <Card className="mx-auto max-w-2xl">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">No Pregnancy Schedule Yet</CardTitle>
              <CardDescription className="text-sm">
                Please contact your healthcare provider to set up your pregnancy care schedule.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            <Card className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                  Your Pregnancy Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="p-3 sm:p-4 bg-background/50 rounded-lg">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">LMP Date</p>
                  <p className="text-base sm:text-lg font-semibold">
                    {format(parseISO(patientScan.lmp_date), 'dd-MMM-yyyy')}
                  </p>
                </div>
                <div className="p-3 sm:p-4 bg-background/50 rounded-lg">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Expected Due Date (EDD)</p>
                  <p className="text-base sm:text-lg font-semibold text-primary">
                    {format(parseISO(patientScan.edd_date), 'dd-MMM-yyyy')}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div>
              <h2 className="mb-3 sm:mb-4 text-lg sm:text-2xl font-semibold px-1">Your Scan Schedule</h2>
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {calculatedScans.map((scan, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm sm:text-lg leading-tight">{scan.scanName}</CardTitle>
                        <Badge variant="secondary" className="text-xs flex-shrink-0">{scan.weekRange}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 sm:space-y-3">
                      <div className="p-2 sm:p-3 bg-primary/5 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Recommended Date</p>
                        <p className="text-sm sm:text-base font-semibold text-primary">{scan.calculatedDate}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Appointment Window</p>
                        <p className="text-xs sm:text-sm">{scan.dateRange}</p>
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
