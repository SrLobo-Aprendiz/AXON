import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { NEXT_PUBLIC_APP_NAME } from '@/lib/config';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Home } from 'lucide-react';

interface CreateFamilyDialogProps {
  children: React.ReactNode;
}

const CreateFamilyDialog: React.FC<CreateFamilyDialogProps> = ({ children }) => {
  const { createNewHousehold } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [householdName, setHouseholdName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!householdName.trim()) {
      toast({
        title: 'Household name required',
        description: 'Please enter a name for your household.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const household = await createNewHousehold(householdName.trim());
      
      if (household) {
        toast({
          title: 'Household created!',
          description: `Welcome to ${household.name}. You're now the owner.`,
        });
        setOpen(false);
        setHouseholdName('');
      } else {
        toast({
          title: 'Creation failed',
          description: 'Could not create household. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating household:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Home className="w-5 h-5 text-primary" />
              Create Your Household
            </DialogTitle>
            <DialogDescription>
              Start your {NEXT_PUBLIC_APP_NAME} journey by creating a household space. You'll be the owner with full control.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="household-name">Household Name</Label>
              <Input
                id="household-name"
                placeholder="e.g., The Smiths, Casa Garcia"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                disabled={isSubmitting}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                This will be visible to all household members.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !householdName.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Household'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateFamilyDialog;
