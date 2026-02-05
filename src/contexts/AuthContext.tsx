import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Household, HouseholdMember, Profile } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  currentHousehold: Household | null;
  currentRole: HouseholdMember['role'] | null;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (email: string, password: string, displayName: string, pioneerCode?: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  switchHousehold: (householdId: string) => Promise<void>;
  createNewHousehold: (name: string) => Promise<Household | null>;
  joinHouseholdByToken: (token: string) => Promise<{ error: string | null }>;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentHousehold, setCurrentHousehold] = useState<Household | null>(null);
  const [currentRole, setCurrentRole] = useState<HouseholdMember['role'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile from Supabase
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, household_ids, ui_mode, updated_at, current_household_id, is_superadmin')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data;
  }, []);

  // Fetch household by ID
  const fetchHousehold = useCallback(async (householdId: string) => {
    const { data, error } = await supabase
      .from('households')
      .select('*')
      .eq('id', householdId)
      .single();

    if (error) {
      console.error('Error fetching household:', error);
      return null;
    }
    return data;
  }, []);

  // Fetch user role for a household (role es TEXT en DB)
  const fetchUserRole = useCallback(async (userId: string, householdId: string): Promise<HouseholdMember['role'] | null> => {
    const { data, error } = await supabase
      .from('household_members')
      .select('role')
      .eq('user_id', userId)
      .eq('household_id', householdId)
      .single();

    if (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
    const role = data?.role;
    if (role === 'owner' || role === 'admin' || role === 'member') return role;
    return null;
  }, []);

// Load user data after auth state change
const loadUserData = useCallback(async (userId: string) => {
  // 1. Cargamos el perfil básico
  const userProfile = await fetchProfile(userId);
  
  if (userProfile) {
    setProfile(userProfile);

    // --- CORRECCIÓN: Miramos directamente la tabla de miembros ---
    const { data: memberData, error: memberError } = await supabase
      .from('household_members')
      .select('household_id, role')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    // Si encontramos casa real en la DB...
    if (memberData && memberData.household_id) {
      const household = await fetchHousehold(memberData.household_id);
      
      if (household) {
        setCurrentHousehold(household);
        // Usamos el rol real de la base de datos
        setCurrentRole(memberData.role as HouseholdMember['role']);
        
        // Sincronizamos el perfil silenciosamente si hace falta
        if (userProfile.current_household_id !== household.id) {
           supabase.from('profiles').update({ current_household_id: household.id }).eq('id', userId).then();
        }
      } else {
        setCurrentHousehold(null);
        setCurrentRole(null);
      }
    } else {
      // No tiene casa
      setCurrentHousehold(null);
      setCurrentRole(null);
    }
  }
}, [fetchProfile, fetchHousehold]);


  // Initialize auth state
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer Supabase calls with setTimeout to prevent deadlock
        if (session?.user) {
          setTimeout(() => {
            loadUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setCurrentHousehold(null);
          setCurrentRole(null);
        }
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loadUserData]);

  const refetchProfile = useCallback(async () => {
    if (user) {
      await loadUserData(user.id);
    }
  }, [user, loadUserData]);

  const login = useCallback(async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  }, []);

  const signup = useCallback(async (
    email: string,
    password: string,
    displayName: string,
    pioneerCode?: string
  ): Promise<{ error: string | null }> => {
    // SECURITY: Use RPC to claim pioneer code BEFORE signup
    // This ensures atomic validation and prevents race conditions
    if (pioneerCode) {
      const { data: claimed, error: rpcError } = await supabase.rpc('claim_pioneer_code', {
        input_code: pioneerCode.toUpperCase(),
      });

      if (rpcError) {
        console.error('RPC error:', rpcError);
        return { error: 'Failed to validate pioneer code. Please try again.' };
      }

      if (!claimed) {
        return { error: 'Invalid or already used pioneer code.' };
      }
      // Code is now claimed and locked - proceed with signup
    }

    // Sign up the user
    const redirectUrl = `${window.location.origin}/`;
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: displayName,
        },
      },
    });

    if (authError) {
      return { error: authError.message };
    }

    if (!authData.user) {
      return { error: 'Failed to create account.' };
    }

    // If pioneer code was used, create a household for the user
    if (pioneerCode) {
      const { data: household, error: householdError } = await supabase
        .from('households')
        .insert({ name: `${displayName}'s Household` })
        .select()
        .single();

      if (householdError || !household) {
        console.error('Error creating household:', householdError);
        return { error: null }; // User created, but household creation failed
      }

      // Update profile with household_ids
      await supabase
        .from('profiles')
        .update({ household_ids: [household.id], current_household_id: household.id })
        .eq('id', authData.user.id);

      // Add household membership as owner
      await supabase.from('household_members').insert({
        user_id: authData.user.id,
        household_id: household.id,
        role: 'owner',
        nickname: displayName,
      });
    }

    return { error: null };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setCurrentHousehold(null);
    setCurrentRole(null);
  }, []);

  const switchHousehold = useCallback(async (householdId: string) => {
    if (!user || !profile) return;
    
    if (!profile.household_ids?.includes(householdId)) {
      console.error('User is not a member of this household');
      return;
    }

    // Persist selección en el perfil
    await supabase
      .from('profiles')
      .update({ current_household_id: householdId })
      .eq('id', user.id);

    const household = await fetchHousehold(householdId);
    if (household) {
      setCurrentHousehold(household);
      const role = await fetchUserRole(user.id, householdId);
      setCurrentRole(role);
    }
  }, [user, profile, fetchHousehold, fetchUserRole]);

  const createNewHousehold = useCallback(async (name: string): Promise<Household | null> => {
    if (!user || !profile) return null;

    const { data: household, error: createError } = await supabase
      .from('households')
      .insert({ name })
      .select()
      .single();

    if (createError || !household) {
      console.error('Error creating household:', createError);
      return null;
    }

    // Crea membership owner
    await supabase.from('household_members').insert({
      household_id: household.id,
      user_id: user.id,
      role: 'owner',
      nickname: profile.full_name ?? null,
    });

    const nextHouseholdIds = [...(profile.household_ids || []), household.id];
    await supabase
      .from('profiles')
      .update({ household_ids: nextHouseholdIds, current_household_id: household.id })
      .eq('id', user.id);

    setProfile({ ...profile, household_ids: nextHouseholdIds, current_household_id: household.id });
    setCurrentHousehold(household);
    setCurrentRole('owner');

    return household;
  }, [user, profile]);

  const joinHouseholdByToken = useCallback(async (token: string): Promise<{ error: string | null }> => {
    if (!user || !profile) {
      return { error: 'You must be logged in to accept an invitation.' };
    }

    // Find invitation
    const { data: invitation, error: invError } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (invError || !invitation) {
      return { error: 'Invalid or expired invitation.' };
    }

    // Check expiry
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return { error: 'This invitation has expired.' };
    }

    if (!invitation.household_id) {
      return { error: 'Invalid invitation - no household specified.' };
    }

    // Update profile with new household_id
    const nextHouseholdIds = [...(profile.household_ids || []), invitation.household_id];
    await supabase
      .from('profiles')
      .update({ household_ids: nextHouseholdIds, current_household_id: invitation.household_id })
      .eq('id', user.id);

    // Add household member as member
    await supabase.from('household_members').insert({
      user_id: user.id,
      household_id: invitation.household_id,
      role: 'member',
      nickname: profile.full_name ?? null,
    });

    // Delete the invitation
    await supabase
      .from('invitations')
      .delete()
      .eq('id', invitation.id);

    // Switch to the new household
    const household = await fetchHousehold(invitation.household_id);
    if (household) {
      setProfile({ ...profile, household_ids: nextHouseholdIds, current_household_id: invitation.household_id });
      setCurrentHousehold(household);
      setCurrentRole('member');
    }

    return { error: null };
  }, [user, profile, fetchHousehold]);

  const value: AuthContextType = {
    user,
    profile,
    session,
    isLoading,
    isAuthenticated: !!user && !!session,
    currentHousehold,
    currentRole,
    login,
    signup,
    logout,
    switchHousehold,
    createNewHousehold,
    joinHouseholdByToken,
    refetchProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
