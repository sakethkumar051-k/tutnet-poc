import { Button } from "./ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";

const CONFIRM_VARIANT = {
    red: "destructive",
    blue: "default",
    green: "default",
    indigo: "default",
};

const ConfirmationModal = ({
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    confirmColor = "red",
    onConfirm,
    onCancel,
}) => {
    return (
        <Dialog open onOpenChange={(isOpen) => !isOpen && onCancel()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{message}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onCancel}>
                        {cancelText}
                    </Button>
                    <Button
                        type="button"
                        variant={CONFIRM_VARIANT[confirmColor] || "default"}
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ConfirmationModal;

