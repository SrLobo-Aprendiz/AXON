import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { usePerformanceSettings, PerformanceMode } from '@/hooks/usePerformanceSettings';
import { Zap, Cpu, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppSettingsDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export const AppSettingsDialog: React.FC<AppSettingsDialogProps> = ({ isOpen, onOpenChange }) => {
    const { mode, setMode } = usePerformanceSettings();

    const handleModeChange = (value: string) => {
        setMode(value as PerformanceMode);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="bg-zinc-950 border-zinc-800 text-white w-[90%] max-w-md rounded-2xl p-6 gap-6">
                <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-zinc-900">
                    <div className="space-y-1">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Cpu className="w-5 h-5 text-blue-500" /> Ajustes del Sistema
                        </DialogTitle>
                        <DialogDescription className="text-zinc-500 text-xs">
                            Configura el rendimiento y apariencia de AXON OS.
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <div className="space-y-6 py-2">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-orange-400" />
                            <Label className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Motor de Interfaz (UI)</Label>
                        </div>

                        <RadioGroup
                            value={mode}
                            onValueChange={handleModeChange}
                            className="grid grid-cols-1 gap-3"
                        >
                            {/* AUTO */}
                            <label
                                htmlFor="mode-auto"
                                className={cn(
                                    "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                                    mode === 'auto' ? "bg-blue-500/10 border-blue-500/50" : "bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <RadioGroupItem value="auto" id="mode-auto" className="border-zinc-700 text-blue-500" />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold">Automático</span>
                                        <span className="text-[10px] text-zinc-500 italic">Detecta tu dispositivo (Recomendado)</span>
                                    </div>
                                </div>
                            </label>

                            {/* LOW / LITE */}
                            <label
                                htmlFor="mode-low"
                                className={cn(
                                    "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                                    mode === 'low' ? "bg-orange-500/10 border-orange-500/50" : "bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <RadioGroupItem value="low" id="mode-low" className="border-zinc-700 text-orange-500" />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold">Modo LITE (Rendimiento)</span>
                                        <span className="text-[10px] text-zinc-500">Usa elementos nativos. Ideal para el OPPO A72.</span>
                                    </div>
                                </div>
                                <Zap className={cn("w-4 h-4", mode === 'low' ? "text-orange-400" : "text-zinc-600")} />
                            </label>

                            {/* HIGH / PREMIUM */}
                            <label
                                htmlFor="mode-high"
                                className={cn(
                                    "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                                    mode === 'high' ? "bg-purple-500/10 border-purple-500/50" : "bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <RadioGroupItem value="high" id="mode-high" className="border-zinc-700 text-purple-500" />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold">Modo PREMIUM</span>
                                        <span className="text-[10px] text-zinc-500">Máxima calidad visual y animaciones.</span>
                                    </div>
                                </div>
                                <Sparkles className={cn("w-4 h-4", mode === 'high' ? "text-purple-400" : "text-zinc-600")} />
                            </label>
                        </RadioGroup>
                    </div>
                </div>

                <DialogFooter className="sm:justify-start pt-2">
                    <Button
                        onClick={() => onOpenChange(false)}
                        className="w-full bg-zinc-100 text-zinc-950 hover:bg-white font-bold rounded-xl"
                    >
                        Guardar Cambios
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
