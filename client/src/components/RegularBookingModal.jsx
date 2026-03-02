import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './ui/select';
import { Textarea } from './ui/textarea';

const RegularBookingModal = ({ tutor, onClose, onSuccess }) => {
    const { showSuccess, showError } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        subject: tutor.subjects?.[0] || '',
        preferredDate: '',
        preferredTime: '10:00',
        mode: 'online',
        notes: ''
    });

    // Get today's date for min date
    const today = new Date().toISOString().split('T')[0];

    // Max 30 days from today
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    const maxDateStr = maxDate.toISOString().split('T')[0];

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            await api.post('/bookings', {
                tutorId: tutor.userId?._id || tutor._id,
                subject: formData.subject,
                preferredSchedule: `${formData.preferredDate} ${formData.preferredTime}`,
                sessionDate: formData.preferredDate,
                bookingCategory: 'session', // REGULAR SESSION
                notes: formData.notes
            });

            showSuccess('Your class request has been sent. The tutor will confirm your booking soon.');
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error('Regular booking error:', err);
            showError(err.response?.data?.message || 'We couldn’t send your request. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0 gap-0">
                <DialogHeader className="p-6 border-b">
                    <DialogTitle>Book a One-Time Class</DialogTitle>
                    <DialogDescription>
                        with {tutor.name || tutor.userId?.name}
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-5">
                    <Card className="border-primary/20 bg-primary/5 shadow-none">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Session Fee</p>
                                <p className="text-2xl font-bold">
                                    ₹{tutor.hourlyRate || 500}/hour
                                </p>
                            </div>
                            <Badge variant="secondary">Pay after session</Badge>
                        </CardContent>
                    </Card>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="regular-subject">Subject *</Label>
                            <Select
                                value={formData.subject}
                                onValueChange={(value) => setFormData({ ...formData, subject: value })}
                                required
                            >
                                <SelectTrigger id="regular-subject">
                                    <SelectValue placeholder="Select subject" />
                                </SelectTrigger>
                                <SelectContent>
                                    {tutor.subjects?.map(subject => (
                                        <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="regular-date">Preferred Date *</Label>
                                <Input
                                    id="regular-date"
                                    type="date"
                                    name="preferredDate"
                                    value={formData.preferredDate}
                                    onChange={handleChange}
                                    min={today}
                                    max={maxDateStr}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="regular-time">Time *</Label>
                                <Select
                                    value={formData.preferredTime}
                                    onValueChange={(value) => setFormData({ ...formData, preferredTime: value })}
                                    required
                                >
                                    <SelectTrigger id="regular-time">
                                        <SelectValue placeholder="Select time" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'].map(time => (
                                            <SelectItem key={time} value={time}>{time}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label>Session Mode *</Label>
                            <RadioGroup
                                value={formData.mode}
                                onValueChange={(value) => setFormData({ ...formData, mode: value })}
                                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                            >
                                <label htmlFor="mode-online" className="flex items-center gap-2 rounded-md border p-3">
                                    <RadioGroupItem id="mode-online" value="online" />
                                    <span className="text-sm">Online</span>
                                </label>
                                <label htmlFor="mode-offline" className="flex items-center gap-2 rounded-md border p-3">
                                    <RadioGroupItem id="mode-offline" value="offline" />
                                    <span className="text-sm">In-Person</span>
                                </label>
                            </RadioGroup>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="regular-notes">Additional Notes (Optional)</Label>
                            <Textarea
                                id="regular-notes"
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                rows={3}
                                placeholder="Any specific topics or requirements..."
                            />
                        </div>

                        <Alert>
                            <AlertTitle>What happens next?</AlertTitle>
                            <AlertDescription>
                                The tutor will review your request and confirm. You will be notified once approved.
                            </AlertDescription>
                        </Alert>

                        <div className="flex flex-col sm:flex-row gap-3 pt-1">
                            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" className="flex-1" disabled={submitting}>
                                {submitting ? 'Sending…' : 'Request Class'}
                            </Button>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default RegularBookingModal;
