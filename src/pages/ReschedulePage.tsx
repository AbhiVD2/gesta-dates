import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { calculateEDD } from '@/lib/pregnancyCalculator';

export default function ReschedulePage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [currentScan, setCurrentScan] = useState<any>(null);
  const [newLmpDate, setNewLmpDate] = useState('');

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      fetchCurrentScan();
    }
  }, [selectedPatient]);

  const fetchPatients = async () => {
    try {
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'patient');

      if (!rolesData) return;

      const patientIds = rolesData.map(r => r.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', patientIds);

      setPatients(profilesData || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const fetchCurrentScan = async () => {
    try {
      const { data } = await supabase
        .from('patient_scans')
        .select('*')
        .eq('patient_id', selectedPatient)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setCurrentScan(data);
      if (data) {
        setNewLmpDate(data.lmp_date);
      }
    } catch (error) {
      console.error('Error fetching scan:', error);
    }
  };

  const handleReschedule = async () => {
    if (!selectedPatient || !newLmpDate || !currentScan) return;

    try {
      const eddDate = calculateEDD(parseISO(newLmpDate));

      const { error } = await supabase
        .from('patient_scans')
        .update({
          lmp_date: newLmpDate,
          edd_date: format(eddDate, 'yyyy-MM-dd'),
        })
        .eq('id', currentScan.id);

      if (error) throw error;

      toast.success('Scan schedule updated successfully');
      fetchCurrentScan();
    } catch (error: any) {
      console.error('Error rescheduling:', error);
      toast.error(error.message || 'Failed to reschedule');
    }
  };

  return (
    <div className="container mx-auto max-w-2xl p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <CalendarClock className="h-8 w-8" />
          Reschedule Scans
        </h1>
        <p className="text-muted-foreground">Update patient scan schedules</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Patient Selection</CardTitle>
          <CardDescription>Select a patient to reschedule their scans</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Select Patient</Label>
            <Select value={selectedPatient} onValueChange={setSelectedPatient}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a patient" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {currentScan && (
            <>
              <div>
                <Label>Current LMP Date</Label>
                <Input
                  type="text"
                  value={format(parseISO(currentScan.lmp_date), 'dd-MMM-yyyy')}
                  disabled
                />
              </div>
              <div>
                <Label>Current EDD</Label>
                <Input
                  type="text"
                  value={format(parseISO(currentScan.edd_date), 'dd-MMM-yyyy')}
                  disabled
                />
              </div>
              <div>
                <Label>New LMP Date</Label>
                <Input
                  type="date"
                  value={newLmpDate}
                  onChange={(e) => setNewLmpDate(e.target.value)}
                />
              </div>
              <Button onClick={handleReschedule} className="w-full">
                Update Schedule
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
