import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Play, AlertCircle, ShieldCheck } from 'lucide-react';
import { CommunityGuideline } from '../../safety/types';
import {
    getGuidelines,
    createGuideline,
    updateGuideline,
    deleteGuideline,
    runRetroactiveScan
} from '../../safety/api/client';

const GuidelineManagement: React.FC = () => {
    const [guidelines, setGuidelines] = useState<CommunityGuideline[]>([]);
    const [loading, setLoading] = useState(true);
    const [isScanning, setIsScanning] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingGuideline, setEditingGuideline] = useState<Partial<CommunityGuideline> | null>(null);

    const fetchGuidelines = async () => {
        try {
            const data = await getGuidelines();
            setGuidelines(data);
        } catch (err) {
            toast.error("Failed to fetch guidelines");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGuidelines();
    }, []);

    const handleSave = async () => {
        if (!editingGuideline?.title || !editingGuideline?.description) {
            toast.error("Title and Description are required");
            return;
        }

        try {
            const payload = {
                ...editingGuideline,
                is_active: true,
                severity: Number(editingGuideline.severity) || 5
            };

            if (editingGuideline.id) {
                await updateGuideline(editingGuideline.id, payload);
                toast.success("Guideline updated");
            } else {
                await createGuideline(payload);
                toast.success("Guideline created");
            }
            setIsDialogOpen(false);
            fetchGuidelines();
        } catch (err) {
            toast.error("Failed to save guideline");
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this guideline?")) return;
        try {
            await deleteGuideline(id);
            toast.success("Guideline deleted");
            fetchGuidelines();
        } catch (err) {
            toast.error("Failed to delete guideline");
        }
    };

    const runScan = async () => {
        if (!window.confirm("This will re-scan ALL existing posts and profiles. This might take some time and issue many warnings. Proceed?")) return;
        setIsScanning(true);
        try {
            await runRetroactiveScan();
            toast.success("Retroactive scan started in background");
        } catch (err) {
            toast.error("Failed to trigger scan");
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <ShieldCheck className="text-primary" />
                        Community Guidelines
                    </h2>
                    <p className="text-muted-foreground text-sm">Define the rules enforced by the AI Moderator.</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        className="gap-2 border-orange-500/50 hover:bg-orange-500/10"
                        onClick={runScan}
                        disabled={isScanning}
                    >
                        <Play className={`h-4 w-4 ${isScanning ? 'animate-pulse' : ''}`} />
                        {isScanning ? 'Scanning...' : 'Run Retroactive Scan'}
                    </Button>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2" onClick={() => setEditingGuideline({ title: '', description: '', severity: 5 })}>
                                <Plus className="h-4 w-4" />
                                Add Guideline
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-gray-900 text-white border-gray-800">
                            <DialogHeader>
                                <DialogTitle>{editingGuideline?.id ? 'Edit Guideline' : 'New Guideline'}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Title</label>
                                    <Input
                                        value={editingGuideline?.title}
                                        onChange={e => setEditingGuideline({ ...editingGuideline, title: e.target.value })}
                                        className="bg-gray-800 border-gray-700"
                                        placeholder="e.g. No Harassment"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Description</label>
                                    <Textarea
                                        value={editingGuideline?.description}
                                        onChange={e => setEditingGuideline({ ...editingGuideline, description: e.target.value })}
                                        className="bg-gray-800 border-gray-700"
                                        rows={4}
                                        placeholder="Detailed explanation of the rule for the AI..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Severity (1-10)</label>
                                    <Input
                                        type="number"
                                        min="1" max="10"
                                        value={editingGuideline?.severity ?? ''}
                                        onChange={e => {
                                            const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                                            setEditingGuideline({ ...editingGuideline, severity: isNaN(val as number) && e.target.value !== '' ? editingGuideline?.severity : val });
                                        }}
                                        className="bg-gray-800 border-gray-700"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleSave}>Save Guideline</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card className="bg-card/20 border-border/40">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Rule</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Severity</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {guidelines.map((g) => (
                            <TableRow key={g.id}>
                                <TableCell className="font-bold">{g.title}</TableCell>
                                <TableCell className="max-w-md text-sm text-muted-foreground truncate" title={g.description}>
                                    {g.description}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={g.severity > 7 ? 'destructive' : 'secondary'}>
                                        Level {g.severity}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right flex justify-end gap-2">
                                    <Button size="icon" variant="ghost" onClick={() => {
                                        setEditingGuideline(g);
                                        setIsDialogOpen(true);
                                    }}>
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="text-red-500" onClick={() => handleDelete(g.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-200 text-sm">
                <AlertCircle className="shrink-0 mt-0.5" size={18} />
                <p>
                    <strong>Retroactive Scan Note:</strong> Running a scan will use Gemini AI tokens for every existing post.
                    Detections will immediately trigger enforcement (deletions and strikes). Refresh the logs after completion.
                </p>
            </div>
        </div>
    );
};

export default GuidelineManagement;
