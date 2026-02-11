import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useReportsApi } from '../api/reportsApi';
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedUser: { id: string; display_name: string; username: string } | null;
  onSuccess?: () => void;
}

const REASONS = [
  "Adult Content",
  "Abuse",
  "Abnormal Use",
  "Spam",
  "Harassment",
  "Other"
];

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, reportedUser, onSuccess }) => {
  const [reason, setReason] = useState(REASONS[0]);
  const [description, setDescription] = useState("");
  const { useSubmitReport } = useReportsApi();
  const { mutate: submitReport, isPending } = useSubmitReport();

  const handleSubmit = () => {
    if (!reportedUser) return;
    submitReport({
      reported_id: reportedUser.id,
      reason,
      description
    }, {
      onSuccess: () => {
        toast.success("Report submitted successfully");
        onClose();
        setDescription("");
        setReason(REASONS[0]);
        onSuccess?.();
      },
      onError: () => {
        toast.error("Failed to submit report");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Report {reportedUser?.display_name || reportedUser?.username}</DialogTitle>
          <DialogDescription>
            Please select a reason for reporting this user.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <RadioGroup value={reason} onValueChange={setReason} className="grid grid-cols-1 gap-2">
            {REASONS.map((r) => (
              <div key={r} className="flex items-center space-x-2">
                <RadioGroupItem value={r} id={r} />
                <Label htmlFor={r}>{r}</Label>
              </div>
            ))}
          </RadioGroup>
          <div className="grid w-full gap-1.5">
            <Label htmlFor="description">Additional Details (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Please provide more context..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
