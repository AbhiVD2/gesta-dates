import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Scans() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Scan Management</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>All Scans</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Scan records and scheduling will be displayed here</p>
        </CardContent>
      </Card>
    </div>
  );
}
