import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Checkbox } from './ui/checkbox';
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

const FREQUENCY_OPTIONS = [
    { value: 2, label: '2 classes per week' },
    { value: 3, label: '3 classes per week' },
    { value: 5, label: '5 classes per week' },
    { value: 'custom', label: 'Custom' }
];

const DURATION_OPTIONS = [
    { value: 1, label: '1 month', sendMonths: 1 },
    { value: 3, label: '3 months', sendMonths: 3 },
    { value: 6, label: '6 months', sendMonths: 6 },
    { value: 'ongoing', label: 'Ongoing', sendDuration: 'Ongoing' }
];

const PermanentBookingModal = ({ tutor, onClose, onSuccess }) => {
    const { showSuccess, showError } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const tutorName = tutor?.userId?.name || tutor?.name || 'this tutor';
    const [formData, setFormData] = useState({
        subject: tutor?.subjects?.[0] || '',
        preferredStartDate: '',
        frequencyOption: 2,
        frequencyCustom: '',
        durationOption: 3,
        learningGoals: '',
        termsAccepted: false
    });

    const today = new Date().toISOString().split('T')[0];

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const setFrequencyOption = (val) => {
        setFormData(prev => ({ ...prev, frequencyOption: val }));
    };
    const setDurationOption = (val) => {
        setFormData(prev => ({ ...prev, durationOption: val }));
    };

    const getSessionsPerWeek = () => {
        if (formData.frequencyOption === 'custom') {
            const n = parseInt(formData.frequencyCustom, 10);
            return Number.isFinite(n) && n >= 1 ? n : 2;
        }
        return typeof formData.frequencyOption === 'number' ? formData.frequencyOption : 2;
    };

    const getDurationPayload = () => {
        const opt = DURATION_OPTIONS.find(o => o.value === formData.durationOption);
        if (!opt) return { monthsCommitted: 3 };
        if (opt.sendDuration) return { durationCommitment: opt.sendDuration };
        return { monthsCommitted: opt.sendMonths };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.termsAccepted) {
            showError('Please confirm that you understand this is an ongoing learning plan.');
            return;
        }
        setSubmitting(true);

        try {
            const sessionsPerWeek = getSessionsPerWeek();
            const duration = getDurationPayload();
            await api.post('/bookings', {
                tutorId: tutor?.userId?._id || tutor?._id,
                subject: formData.subject,
                preferredSchedule: `Starting ${formData.preferredStartDate}, ${sessionsPerWeek} class(es) per week`,
                sessionDate: null,
                bookingCategory: 'permanent',
                preferredStartDate: formData.preferredStartDate,
                sessionsPerWeek,
                frequency: 'weekly',
                learningGoals: formData.learningGoals.trim() || undefined,
                termsAccepted: true,
                ...duration
            });

            showSuccess('Your ongoing plan request has been sent. The tutor will review and finalize the schedule with you.');
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error('Permanent booking error:', err);
            const msg = err.response?.data?.message;
            if (err.response?.data?.code === 'INVALID_START_DATE') {
                showError('Please choose a start date in the future.');
            } else if (err.response?.data?.code === 'TERMS_NOT_ACCEPTED') {
                showError('Please accept the terms to continue.');
            } else {
                showError(msg || 'We couldn’t send your request. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0 gap-0">
                <DialogHeader className="p-6 border-b">
                    <DialogTitle id="permanent-booking-title">
                        Start Ongoing Classes with {tutorName}
                    </DialogTitle>
                    <DialogDescription>
                        Set up a regular learning schedule for consistent progress.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="permanent-subject">Subject *</Label>
                        <Select
                            value={formData.subject}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}
                            required
                        >
                            <SelectTrigger id="permanent-subject">
                                <SelectValue placeholder="Select subject" />
                            </SelectTrigger>
                            <SelectContent>
                                {(tutor?.subjects || []).map(subject => (
                                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="permanent-date">When would you like classes to begin? *</Label>
                        <Input
                            id="permanent-date"
                            type="date"
                            name="preferredStartDate"
                            value={formData.preferredStartDate}
                            onChange={handleChange}
                            min={today}
                            required
                        />
                        <p className="text-xs text-muted-foreground">Pick a date in the future.</p>
                    </div>

                    <div className="space-y-3">
                        <Label>How many classes per week? *</Label>
                        <RadioGroup
                            value={String(formData.frequencyOption)}
                            onValueChange={(value) => setFrequencyOption(value === 'custom' ? 'custom' : Number(value))}
                        >
                            {FREQUENCY_OPTIONS.map(opt => (
                                <label key={opt.value} className="flex items-center gap-2 rounded-md border p-3 cursor-pointer">
                                    <RadioGroupItem value={String(opt.value)} />
                                    <span className="text-sm">{opt.label}</span>
                                </label>
                            ))}
                        </RadioGroup>
                        {formData.frequencyOption === 'custom' && (
                            <div className="space-y-2">
                                <Label htmlFor="frequency-custom">Custom classes per week</Label>
                                <Input
                                    id="frequency-custom"
                                    type="number"
                                    min={1}
                                    max={7}
                                    value={formData.frequencyCustom}
                                    onChange={e => setFormData(prev => ({ ...prev, frequencyCustom: e.target.value }))}
                                    placeholder="Number of classes"
                                    className="max-w-[180px]"
                                />
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        <Label>How long would you like to continue? *</Label>
                        <RadioGroup
                            value={String(formData.durationOption)}
                            onValueChange={(value) => setDurationOption(value === 'ongoing' ? 'ongoing' : Number(value))}
                        >
                            {DURATION_OPTIONS.map(opt => (
                                <label key={opt.value} className="flex items-center gap-2 rounded-md border p-3 cursor-pointer">
                                    <RadioGroupItem value={String(opt.value)} />
                                    <span className="text-sm">{opt.label}</span>
                                </label>
                            ))}
                        </RadioGroup>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="learning-goals">What would you like the student to focus on?</Label>
                        <Textarea
                            id="learning-goals"
                            name="learningGoals"
                            value={formData.learningGoals}
                            onChange={handleChange}
                            rows={3}
                            placeholder="Exam preparation, fundamentals, homework support..."
                        />
                    </div>

                    <label htmlFor="terms-accepted" className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
                        <Checkbox
                            id="terms-accepted"
                            name="termsAccepted"
                            checked={formData.termsAccepted}
                            onCheckedChange={(checked) =>
                                setFormData(prev => ({ ...prev, termsAccepted: Boolean(checked) }))
                            }
                            className="mt-0.5"
                        />
                        <span className="text-sm">
                            I understand this is an ongoing learning plan and can request changes anytime.
                        </span>
                    </label>

                    <Card className="bg-muted/30 shadow-none">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm">What happens next?</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-muted-foreground">
                            <p>1. Tutor reviews your request.</p>
                            <p>2. Schedule is finalized.</p>
                            <p>3. Classes begin on your selected date.</p>
                        </CardContent>
                    </Card>

                    {!formData.termsAccepted && (
                        <Alert variant="destructive">
                            <AlertTitle>Action required</AlertTitle>
                            <AlertDescription>
                                Please accept the ongoing plan terms before submitting.
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 pt-1">
                        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" className="flex-1" disabled={submitting || !formData.termsAccepted}>
                            {submitting ? 'Sending…' : 'Start Ongoing Plan'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default PermanentBookingModal;
