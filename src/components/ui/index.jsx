// src/components/ui/index.js
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils';

export const Button = ({ variant = 'default', size = 'default', className, children, ...props }) => {
    const baseStyle = "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer";
    const variants = {
        default: "bg-primary text-primary-foreground hover:bg-blue-700",
        destructive: "bg-destructive text-destructive-foreground hover:bg-red-700 hover:text-white",
        outline: "border border-input bg-background hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300",
        secondary: "bg-secondary text-secondary-foreground hover:bg-blue-500 hover:text-white",
        ghost: "hover:bg-blue-100 hover:text-blue-700",
        link: "text-primary underline-offset-4 hover:underline",
    };
    const sizes = {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
    };
    return (
        <button className={cn(baseStyle, variants[variant], sizes[size], className)} {...props}>
            {children}
        </button>
    );
};

export const Input = ({ className, type, ...props }) => (
    <input
        type={type}
        className={cn(
            "flex h-10 w-full rounded-md bg-slate-50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
        )}
        {...props}
    />
);

export const Textarea = ({ className, ...props }) => (
    <textarea
        className={cn(
            "flex min-h-[80px] w-full rounded-md bg-slate-50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
        )}
        {...props}
    />
);

export const Select = ({ className, children, multiple, ...props }) => (
    <select
        multiple={multiple}
        className={cn(
            "flex h-auto w-full items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            multiple ? "min-h-[80px]" : "h-10",
            className
        )}
        {...props}
    >
        {children}
    </select>
);

export const Dialog = ({ open, onOpenChange, children, className }) => {
    if (!open) return null;

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onOpenChange(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onOpenChange]);

    return (
        <div className="fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => onOpenChange(false)} role="dialog" aria-modal="true" aria-label="Fermer">
            <div className={cn("relative w-full rounded-lg border bg-card text-card-foreground shadow-xl animate-in fade-in-90 slide-in-from-bottom-10 sm:rounded-lg", className)} onClick={(e) => e.stopPropagation()}>
                {children}
                <button onClick={() => onOpenChange(false)} className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none cursor-pointer" aria-label="Fermer">
                    <X className="h-5 w-5" />
                    <span className="sr-only">Fermer</span>
                </button>
            </div>
        </div>
    );
};

export const DialogContent = ({ className, children, ...props }) => (
    <div className={cn("p-6 pt-0 max-h-[70vh] overflow-y-auto custom-scrollbar", className)} {...props}>{children}</div>
);

export const DialogHeader = ({ className, children, ...props }) => (
    <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left p-6 sticky top-0 bg-card z-10 border-b", className)} {...props}>{children}</div>
);

export const DialogTitle = ({ className, children, id, ...props }) => (
    <h2 id={id} className={cn("text-xl font-semibold leading-none tracking-tight", className)} {...props}>{children}</h2>
);

export const DialogDescription = ({ className, children, ...props }) => (
    <p className={cn("text-sm text-muted-foreground", className)} {...props}>{children}</p>
);

export const DialogFooter = ({ className, children, ...props }) => (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-6 pt-4 border-t sticky bottom-0 bg-card z-10", className)} {...props}>{children}</div>
);

export const Label = ({ className, children, ...props }) => (
    <label className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 block mb-1.5", className)} {...props}>{children}</label>
);

export const ErrorMessage = ({ message, className }) => message ? <p className={cn("text-xs text-red-500 mt-1", className)}>{message}</p> : null;

export const Checkbox = ({ id, checked, onChange, label, className, disabled, name }) => (
    <div className={cn("flex items-center space-x-2", className)}>
        <input
            type="checkbox"
            id={id}
            name={name}
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        />
        <Label htmlFor={id} className="mb-0 font-normal text-sm">{label}</Label>
    </div>
);
