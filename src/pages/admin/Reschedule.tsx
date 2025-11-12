import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Reschedule() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Reschedule Appointments</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Reschedule Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Appointment reschedule management will be displayed here</p>
        </CardContent>
      </Card>
    </div>
  );
}
