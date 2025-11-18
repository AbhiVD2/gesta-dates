import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function SettingsPage() {
  const [scanTypes, setScanTypes] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [scanName, setScanName] = useState('');
  const [weekStart, setWeekStart] = useState('');
  const [weekEnd, setWeekEnd] = useState('');

  useEffect(() => {
    fetchScanTypes();
  }, []);

  const fetchScanTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('scan_types')
        .select('*')
        .order('week_range_start');

      if (error) throw error;
      setScanTypes(data || []);
    } catch (error) {
      console.error('Error fetching scan types:', error);
    }
  };

  const createScanType = async () => {
    try {
      const { error } = await supabase
        .from('scan_types')
        .insert({
          name: scanName,
          week_range_start: parseInt(weekStart),
          week_range_end: parseInt(weekEnd),
          is_default: false,
        });

      if (error) throw error;

      toast.success('Scan type created successfully');
      setOpen(false);
      resetForm();
      fetchScanTypes();
    } catch (error: any) {
      console.error('Error creating scan type:', error);
      toast.error(error.message || 'Failed to create scan type');
    }
  };

  const deleteScanType = async (id: string) => {
    try {
      const { error } = await supabase
        .from('scan_types')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Scan type deleted');
      fetchScanTypes();
    } catch (error: any) {
      console.error('Error deleting scan type:', error);
      toast.error(error.message || 'Failed to delete scan type');
    }
  };

  const resetForm = () => {
    setScanName('');
    setWeekStart('');
    setWeekEnd('');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-muted-foreground">Manage scan types and system settings</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Scan Type
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Scan Type</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Scan Name</Label>
                <Input value={scanName} onChange={(e) => setScanName(e.target.value)} />
              </div>
              <div>
                <Label>Week Range Start</Label>
                <Input type="number" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
              </div>
              <div>
                <Label>Week Range End</Label>
                <Input type="number" value={weekEnd} onChange={(e) => setWeekEnd(e.target.value)} />
              </div>
              <Button onClick={createScanType} className="w-full">Create Scan Type</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scan Types</CardTitle>
          <CardDescription>Manage available scan types</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scan Name</TableHead>
                <TableHead>Week Range</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scanTypes.map((scan) => (
                <TableRow key={scan.id}>
                  <TableCell>{scan.name}</TableCell>
                  <TableCell>{scan.week_range_start}-{scan.week_range_end} weeks</TableCell>
                  <TableCell>{scan.is_default ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    {!scan.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteScanType(scan.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
