import { fetchAuthSettings, supabase as supabaseClient } from './supabaseClient';
import { safeRandomId } from '../utils/safeRandomId';
export class SignupFlowError extends Error {
    stage;
    code;
    constructor(message, stage, code, options) {
        super(message);
        this.stage = stage;
        this.code = code;
        this.name = 'SignupFlowError';
        if (options && 'cause' in options)
            Object.defineProperty(this, 'cause', { value: options.cause, enumerable: false });
    }
}
const APP_USERS_TABLE = 'app_users';
const VALID_ROLES = new Set(['tenant', 'landlord', 'admin']);
const PUBLIC_SIGNUP_ROLES = new Set(['tenant', 'landlord']);
let latestAuthProfileRequestId = 0;
// Supabase only sends mail to redirect targets that are on its allow list, so the
// verification links must be built from a known-good base. VITE_APP_URL lets a
// deployment pin the public origin (useful for Vercel preview domains) instead of
// trusting window.location.origin.
function resolveAuthRedirectBase() {
    const configured = import.meta.env.VITE_APP_URL?.trim();
    if (configured && /^https?:\/\//i.test(configured)) {
        return configured.replace(/\/+$/, '');
    }
    return typeof window === 'undefined' ? '' : window.location.origin;
}
function buildAuthRedirect(path) {
    return `${resolveAuthRedirectBase()}${path}`;
}
// Supabase creates the auth user first and only then talks to the mailer, so a
// signup can succeed while no confirmation email is ever delivered. Classifying
// the response keeps that failure visible instead of silent.
function describeEmailConfirmation(authUser, hasSession) {
    if (hasSession) {
        // A session on signup means "Confirm email" is OFF for the project.
        return { state: 'disabled', sentAt: null };
    }
    if (authUser?.email_confirmed_at) {
        return { state: 'confirmed', sentAt: authUser.confirmation_sent_at ?? null };
    }
    return authUser?.confirmation_sent_at
        ? { state: 'sent', sentAt: authUser.confirmation_sent_at }
        : { state: 'not_sent', sentAt: null };
}
const EMAIL_CONFIRMATION_HINTS = {
    disabled: 'Supabase returned a session at signup, which means "Confirm email" is turned off (Authentication → Sign In/Providers → Email). No confirmation email is sent until it is enabled.',
    not_sent: 'Supabase created the account but did not record a confirmation email. Check Authentication → Logs for "Email address not authorized" or a rate-limit error, then enable custom SMTP (Authentication → Emails → SMTP Settings — the default Supabase sender only delivers to project team members and is capped at a couple of messages per hour).',
};
function logEmailConfirmationProblem(state) {
    const hint = EMAIL_CONFIRMATION_HINTS[state];
    if (!hint)
        return;
    console.error(`[AUTH] Signup finished without a confirmed verification email (${state}). ${hint}`);
}
function isRecord(value) {
    return typeof value === 'object' && value !== null;
}
function getStringValue(row, keys, fallback = '') {
    for (const key of keys) {
        const value = row[key];
        if (typeof value === 'string' && value.trim().length > 0) {
            return value;
        }
    }
    return fallback;
}
function getBooleanValue(row, keys) {
    for (const key of keys) {
        const value = row[key];
        if (typeof value === 'boolean') {
            return value;
        }
        if (typeof value === 'string') {
            if (value.toLowerCase() === 'true')
                return true;
            if (value.toLowerCase() === 'false')
                return false;
        }
    }
    return undefined;
}
function normalizeStatus(row) {
    const status = getStringValue(row, ['status', 'verification_status', 'landlord_status']);
    if (status) {
        return status;
    }
    const isVerified = getBooleanValue(row, ['is_verified']);
    if (typeof isVerified === 'boolean') {
        return isVerified ? 'verified' : 'pending';
    }
    return 'active';
}
function normalizeRoleValue(value) {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    // Keep legacy accounts usable while exposing only the current tenant role.
    return normalized === 'student' || normalized === 'employee' ? 'tenant' : normalized;
}
export function isTenantRole(role) {
    return normalizeRoleValue(role) === 'tenant';
}
function assertValidRole(role) {
    if (!VALID_ROLES.has(role)) {
        throw new Error('Your account role is missing or invalid. Please contact support.');
    }
}
function normalizeUser(row) {
    const record = isRecord(row) ? row : {};
    const role = normalizeRoleValue(record.role);
    return {
        id: getStringValue(record, ['id']),
        authId: getStringValue(record, ['auth_id']) || undefined,
        name: getStringValue(record, ['name', 'full_name']),
        email: getStringValue(record, ['email']),
        username: getStringValue(record, ['username']) || undefined,
        middleInitial: getStringValue(record, ['middle_initial']),
        address: getStringValue(record, ['address']),
        role: role,
        status: normalizeStatus(record),
        createdAt: getStringValue(record, ['created_at']),
        updatedAt: getStringValue(record, ['updated_at']),
        isVerified: getBooleanValue(record, ['is_verified']),
        mobileNumber: getStringValue(record, ['mobile']),
        mobile: getStringValue(record, ['mobile']),
        avatar: getStringValue(record, ['avatar_url']),
        bio: getStringValue(record, ['bio']),
        permitNumber: getStringValue(record, ['permit_number']),
        department: getStringValue(record, ['department']),
        adminLevel: getStringValue(record, ['admin_level']),
    };
}
function toUserPayload(input) {
    const payload = {};
    if (typeof input.name === 'string')
        payload.name = input.name;
    if (typeof input.email === 'string')
        payload.email = input.email;
    if (typeof input.middleInitial === 'string')
        payload.middle_initial = input.middleInitial;
    if (typeof input.address === 'string')
        payload.address = input.address;
    if (typeof input.role === 'string')
        payload.role = input.role;
    if (typeof input.status === 'string')
        payload.status = input.status;
    if (typeof input.isVerified === 'boolean') {
        payload.is_verified = input.isVerified;
        payload.verification_status = input.isVerified ? 'verified' : 'pending';
        payload.landlord_status = input.isVerified ? 'verified' : 'pending';
    }
    if (typeof input.mobile === 'string')
        payload.mobile = input.mobile;
    if (typeof input.mobileNumber === 'string')
        payload.mobile = input.mobileNumber;
    if (typeof input.permitNumber === 'string')
        payload.permit_number = input.permitNumber;
    if (typeof input.department === 'string')
        payload.department = input.department;
    if (typeof input.adminLevel === 'string')
        payload.admin_level = input.adminLevel;
    return payload;
}
function nonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}
async function recordLogin(profile, authId, success = true, metadata = {}) {
    const { error } = await supabaseClient.from('logins').insert({
        user_id: profile?.id ?? null,
        auth_id: authId,
        event: 'sign_in',
        success,
        user_agent: typeof navigator === 'undefined' ? null : navigator.userAgent,
        metadata,
    });
    if (error) {
        console.warn('Failed to record login audit row:', error.message);
    }
}
async function ensureRoleProfile(userId, role, input) {
    let table = null;
    let payload = { user_id: userId };
    if (role === 'landlord') {
        table = 'landlord_profiles';
        if (typeof input.permitNumber === 'string') {
            payload.permit_number = nonEmptyString(input.permitNumber);
            payload.business_permit_number = nonEmptyString(input.permitNumber);
        }
        if (typeof input.businessName === 'string')
            payload.business_name = nonEmptyString(input.businessName);
        if (typeof input.isVerified === 'boolean')
            payload.is_verified = input.isVerified;
    }
    if (role === 'admin') {
        table = 'admin_profiles';
        if (typeof input.adminLevel === 'string')
            payload.admin_level = input.adminLevel;
        if (typeof input.department === 'string')
            payload.department = input.department;
    }
    if (!table)
        return;
    const { error } = await supabaseClient.from(table).upsert(payload, { onConflict: 'user_id' });
    if (error) {
        throw new Error(`Failed to sync ${table}: ${error.message}`);
    }
}
async function uploadLandlordSignupDocuments(userId, input) {
    if (input.role !== 'landlord')
        return;
    const files = [
        { file: input.permitDocument, column: 'verification_document_url', prefix: 'permit' },
        { file: input.idDocument, column: 'id_document_url', prefix: 'identity' },
    ].filter((item) => item.file instanceof File);
    if (files.length === 0)
        return;
    const updates = {};
    for (const item of files) {
        const extension = item.file.name.split('.').pop()?.toLowerCase() || 'bin';
        const path = `${userId}/${item.prefix}-${safeRandomId()}.${extension}`;
        const { error } = await supabaseClient.storage.from('verification-documents').upload(path, item.file, {
            contentType: item.file.type || undefined,
            upsert: false,
        });
        if (error)
            throw new Error(`Unable to upload ${item.prefix} document: ${error.message}`);
        updates[item.column] = path;
    }
    const { error } = await supabaseClient.from('landlord_profiles').update(updates).eq('user_id', userId);
    if (error)
        throw new Error(`Unable to link verification documents: ${error.message}`);
}
export function persistCurrentUser(_user) {
    // Compatibility no-op. Supabase Auth and the database profile are authoritative.
}
export async function fetchAppUsers() {
    const [{ data, error }, { data: publicLandlords, error: publicError }] = await Promise.all([
        supabaseClient.from(APP_USERS_TABLE).select('*'),
        supabaseClient.from('public_landlords').select('*'),
    ]);
    if (error && publicError) {
        throw new Error(error.message);
    }
    const users = new Map();
    [...(publicLandlords ?? []), ...(data ?? [])].forEach((row) => {
        const normalized = normalizeUser(row);
        if (normalized.id)
            users.set(normalized.id, normalized);
    });
    return [...users.values()];
}
export async function fetchUserById(userId) {
    const { data, error } = await supabaseClient.from(APP_USERS_TABLE).select('*').eq('id', userId).maybeSingle();
    if (error) {
        throw new Error(error.message);
    }
    return data ? normalizeUser(data) : null;
}
export async function fetchUserByAuthId(authId) {
    const { data, error } = await supabaseClient.from(APP_USERS_TABLE).select('*').eq('auth_id', authId).maybeSingle();
    if (error) {
        throw new Error(error.message);
    }
    return data ? normalizeUser(data) : null;
}
export async function fetchUserByEmail(email) {
    const { data, error } = await supabaseClient.from(APP_USERS_TABLE).select('*').eq('email', email).maybeSingle();
    if (error) {
        throw new Error(error.message);
    }
    return data ? normalizeUser(data) : null;
}
// Resolves to null (instead of creating a profile) when createIfMissing is
// false, and for a first-time "Continue with Google" user who has not chosen
// Tenant or Landlord yet — /auth/callback creates that profile.
async function ensureProfileForAuthUser(authUser, { createIfMissing = true } = {}) {
    const existingByAuthId = await fetchUserByAuthId(authUser.id);
    if (existingByAuthId) {
        assertValidRole(existingByAuthId.role);
        await ensureRoleProfile(existingByAuthId.id, existingByAuthId.role, {
            permitNumber: existingByAuthId.permitNumber,
            adminLevel: existingByAuthId.adminLevel,
            department: existingByAuthId.department,
            isVerified: existingByAuthId.isVerified,
        });
        return existingByAuthId;
    }
    const email = authUser.email ?? '';
    const existingByEmail = email ? await fetchUserByEmail(email) : null;
    if (existingByEmail) {
        assertValidRole(existingByEmail.role);
        const { data, error } = await supabaseClient
            .from(APP_USERS_TABLE)
            .update({ auth_id: authUser.id })
            .eq('id', existingByEmail.id)
            .select('*')
            .single();
        if (error) {
            throw new Error(error.message);
        }
        const profile = normalizeUser(data);
        assertValidRole(profile.role);
        await ensureRoleProfile(profile.id, profile.role, {
            adminLevel: profile.adminLevel,
            department: profile.department,
            permitNumber: profile.permitNumber,
            isVerified: profile.isVerified,
        });
        return profile;
    }
    const role = normalizeRoleValue(authUser.user_metadata?.role);
    if (!createIfMissing || (isOAuthAuthUser(authUser) && !PUBLIC_SIGNUP_ROLES.has(role))) {
        return null;
    }
    if (role !== 'tenant' && role !== 'landlord') {
        throw new Error('A public account profile cannot be created with this role.');
    }
    const name = typeof authUser.user_metadata?.name === 'string' ? authUser.user_metadata.name : email.split('@')[0] || 'User';
    const middleInitial = typeof authUser.user_metadata?.middleInitial === 'string' ? authUser.user_metadata.middleInitial : null;
    const address = typeof authUser.user_metadata?.address === 'string' ? authUser.user_metadata.address : null;
    const mobile = typeof authUser.user_metadata?.mobile === 'string' ? authUser.user_metadata.mobile : null;
    const status = role === 'landlord' ? 'pending' : 'active';
    const { data, error } = await supabaseClient
        .from(APP_USERS_TABLE)
        .insert({
        auth_id: authUser.id,
        email,
        name,
        middle_initial: nonEmptyString(middleInitial),
        address: nonEmptyString(address),
        mobile: nonEmptyString(mobile),
        role,
        status,
        is_verified: role !== 'landlord',
    })
        .select('*')
        .single();
    if (error) {
        throw new Error(error.message);
    }
    const profile = normalizeUser(data);
    await ensureRoleProfile(profile.id, profile.role, {
        permitNumber: typeof authUser.user_metadata?.permitNumber === 'string' ? authUser.user_metadata.permitNumber : undefined,
        businessName: typeof authUser.user_metadata?.businessName === 'string' ? authUser.user_metadata.businessName : undefined,
        isVerified: profile.isVerified,
    });
    return profile;
}
function requiresPendingEmailVerification(authUser) {
    return !authUser.email_confirmed_at;
}
function assertActiveAccount(user) {
    if (String(user.status).toLowerCase() === 'disabled') {
        throw new Error('This account has been deactivated. Contact an administrator.');
    }
}
export async function getCurrentAuthenticatedUser() {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
        throw new Error(error.message);
    }
    const authUser = data.session?.user;
    if (!authUser) {
        persistCurrentUser(null);
        return null;
    }
    if (requiresPendingEmailVerification(authUser)) {
        await supabaseClient.auth.signOut();
        persistCurrentUser(null);
        return null;
    }
    const profile = await ensureProfileForAuthUser(authUser);
    if (!profile) {
        // Signed in with Google, but the account setup on /auth/callback was
        // not finished yet. Keep the Supabase session so it can be completed.
        persistCurrentUser(null);
        return null;
    }
    assertActiveAccount(profile);
    persistCurrentUser(profile);
    return profile;
}
export function onAuthStateChange(callback) {
    const { data } = supabaseClient.auth.onAuthStateChange((_event, session) => {
        const requestId = ++latestAuthProfileRequestId;
        const authUser = session?.user;
        if (!authUser) {
            persistCurrentUser(null);
            callback(null);
            return;
        }
        if (requiresPendingEmailVerification(authUser)) {
            void supabaseClient.auth.signOut();
            persistCurrentUser(null);
            callback(null);
            return;
        }
        void ensureProfileForAuthUser(authUser)
            .then((profile) => {
            if (requestId !== latestAuthProfileRequestId)
                return;
            if (!profile) {
                persistCurrentUser(null);
                callback(null);
                return;
            }
            assertActiveAccount(profile);
            persistCurrentUser(profile);
            callback(profile);
        })
            .catch((error) => {
            if (requestId !== latestAuthProfileRequestId)
                return;
            console.error('Failed to load Supabase Auth profile:', error);
            persistCurrentUser(null);
            callback(null);
        });
    });
    return () => data.subscription.unsubscribe();
}
function signupLog(message, details) {
    if (!import.meta.env.DEV)
        return;
    if (details)
        console.info(message, details);
    else
        console.info(message);
}
function mapSignupError(error) {
    const message = error.message ?? '';
    const code = error.code ?? '';
    console.error('[AUTH] Signup request failed', { message, status: error.status, code: error.code });
    if (/already registered|already exists|user.*exists/i.test(message)) {
        return new SignupFlowError('An account may already exist for this email. Try signing in, resending verification, or resetting your password.', 'auth', 'email_exists', { cause: error });
    }
    if (/invalid.*email|email.*invalid/i.test(message))
        return new SignupFlowError('Enter a valid email address.', 'validation', 'invalid_email', { cause: error });
    if (/password|weak/i.test(message))
        return new SignupFlowError('Choose a stronger password that meets the password requirements.', 'validation', 'weak_password', { cause: error });
    if (/signup.*disabled|signups.*disabled/i.test(message))
        return new SignupFlowError('Account registration is temporarily unavailable.', 'auth', 'signup_disabled', { cause: error });
    if (error.status === 429 || /rate|too many|seconds/i.test(message) || /over_email_send_rate_limit/i.test(code)) {
        return new SignupFlowError("We couldn't send the confirmation email right now. Please try again shortly.", 'auth', 'confirmation_email_rate_limit', { cause: error });
    }
    if (/smtp|mailer|email.*send|send.*email|confirmation.*email|email.*not.*authorized|not.*authorized.*email/i.test(`${code} ${message}`)) {
        return new SignupFlowError("We couldn't send the confirmation email right now. Please try again shortly.", 'auth', 'confirmation_email_delivery', { cause: error });
    }
    if (/database|trigger|permission|row-level|rls/i.test(message))
        return new SignupFlowError('Account registration could not be completed because profile setup failed. No retry is needed until the database configuration is corrected.', 'profile', 'profile_database', { cause: error });
    if (/fetch|network|connection/i.test(message))
        return new SignupFlowError('We could not reach the account service. Check your connection and try again.', 'auth', 'network', { cause: error });
    return new SignupFlowError('We could not complete account registration. Please try again later.', 'auth', 'unexpected', { cause: error });
}
function pendingSignupUser(input, authId, role) {
    return {
        id: authId,
        authId,
        name: input.name,
        email: input.email.trim().toLowerCase(),
        username: input.username.trim().toLowerCase(),
        role,
        status: role === 'landlord' ? 'pending' : 'active',
        isVerified: role !== 'landlord',
        mobile: input.mobile ?? input.mobileNumber,
        mobileNumber: input.mobile ?? input.mobileNumber,
    };
}
export async function signupUser(input) {
    const email = input.email.trim().toLowerCase();
    const username = input.username.trim().toLowerCase();
    const role = isTenantRole(input.role) ? 'tenant' : input.role;
    if (role !== 'tenant' && role !== 'landlord')
        throw new SignupFlowError('Public registration supports tenant and landlord accounts only.', 'validation', 'invalid_public_role');
    if (input.termsAccepted !== true)
        throw new SignupFlowError('You must agree to the Terms of Use and Privacy Policy to continue.', 'validation', 'terms_required');
    if (role === 'landlord' && input.landlordVerificationAccepted !== true)
        throw new SignupFlowError('You must agree to the Terms of Use and Landlord Verification Policy to continue.', 'validation', 'landlord_policy_required');
    if (!/^[a-z0-9_]{4,30}$/.test(username))
        throw new SignupFlowError('Username must be 4–30 characters using only letters, numbers, or underscores.', 'validation', 'invalid_username');
    if (!/^\S+@\S+\.\S+$/.test(email))
        throw new SignupFlowError('Enter a valid email address.', 'validation', 'invalid_email');
    signupLog('[AUTH] Signup started', { email, role });
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email,
        password: input.password,
        options: {
            emailRedirectTo: buildAuthRedirect('/auth/callback'),
            data: {
                username,
                name: input.name,
                role,
                mobile: input.mobile ?? input.mobileNumber,
                middleInitial: input.middleInitial,
                address: input.address,
                permitNumber: role === 'landlord' ? input.permitNumber : undefined,
                businessName: role === 'landlord' ? input.businessName : undefined,
                termsAccepted: true,
                landlordVerificationAccepted: role === 'landlord' ? true : undefined,
                requires_email_verification: true,
            },
        },
    });
    if (authError)
        throw mapSignupError(authError);
    if (!authData.user) {
        console.error('[AUTH] Signup returned no user and no Supabase error');
        throw new SignupFlowError('We could not confirm that account registration completed. Try signing in, resending verification, or resetting your password before registering again.', 'auth', 'missing_auth_response');
    }
    // Supabase deliberately obscures duplicate-email signup when email
    // confirmation is enabled. An empty identities array means no new identity
    // was created, so never continue with profile creation or report success.
    const existingAccount = Array.isArray(authData.user.identities) && authData.user.identities.length === 0;
    if (existingAccount) {
        signupLog('[AUTH] Existing account response received', { email });
        // Supabase deliberately does NOT resend the confirmation email for an
        // already registered address, so the caller must offer a manual resend.
        return {
            user: pendingSignupUser(input, authData.user.id, role),
            accountCreated: false,
            profileCreated: false,
            requiresEmailVerification: !authData.user.email_confirmed_at,
            existingAccount: true,
            emailConfirmation: { state: 'existing_account', sentAt: authData.user.confirmation_sent_at ?? null },
        };
    }
    const requiresEmailVerification = !authData.user.email_confirmed_at;
    const emailConfirmation = describeEmailConfirmation(authData.user, Boolean(authData.session));
    logEmailConfirmationProblem(emailConfirmation.state);
    signupLog('[AUTH] Auth account created', { authUserId: authData.user.id });
    signupLog(requiresEmailVerification ? '[AUTH] Verification pending' : '[AUTH] Email already confirmed');
    // handle_new_auth_user runs in the same database transaction as Auth user
    // creation. A successful signUp therefore means the base app_users and role
    // profile upserts completed. With confirmation enabled there is no session,
    // so the client must not attempt anonymous writes to private profile tables.
    let profile = pendingSignupUser(input, authData.user.id, role);
    let profileSetupError;
    if (authData.session) {
        try {
            signupLog('[PROFILE] Checking app_users profile');
            profile = await ensureProfileForAuthUser(authData.user);
            signupLog('[PROFILE] Profile exists', { profileId: profile.id });
            await uploadLandlordSignupDocuments(profile.id, input);
        }
        catch (error) {
            console.error('[PROFILE] Auth account exists but profile finalization failed', error);
            profileSetupError = 'Your account was created, but we could not finish setting up your profile. Verify your email, then try signing in or contact support.';
        }
        finally {
            await supabaseClient.auth.signOut();
        }
    }
    signupLog('[AUTH] Signup flow complete', { requiresEmailVerification, emailConfirmation: emailConfirmation.state, profileSetupError: Boolean(profileSetupError) });
    return {
        user: profile,
        accountCreated: true,
        profileCreated: !profileSetupError,
        requiresEmailVerification,
        existingAccount: false,
        emailConfirmation,
        profileSetupError,
    };
}
export async function loginUser(credentials) {
    const username = credentials.username?.trim().toLowerCase();
    const password = credentials.password;
    if (!username || !password) {
        throw new Error('Username and password are required.');
    }
    // Resolve only the internal Supabase Auth email. Password verification still
    // happens through Supabase Auth, and app_users remains protected by RLS.
    const { data: resolvedEmail, error: resolveError } = await supabaseClient.rpc('fn_resolve_username_login', {
        p_username: username,
    });
    if (resolveError) {
        console.error('[AUTH] Username resolution failed', {
            message: resolveError.message,
            code: resolveError.code,
            details: resolveError.details,
        });
        throw new Error('Username sign-in is temporarily unavailable. Please try again later.');
    }
    if (typeof resolvedEmail !== 'string' || !resolvedEmail.trim()) {
        throw new Error('Invalid username or password.');
    }
    const { data, error: signInError } = await supabaseClient.auth.signInWithPassword({
        email: resolvedEmail.trim(),
        password,
    });
    if (signInError || !data.user) {
        const message = signInError?.message ?? '';
        console.error('[AUTH] Password sign-in failed', {
            message,
            status: signInError?.status,
            code: signInError?.code,
        });
        if (signInError?.status === 429 || /rate|too many/i.test(message)) {
            throw new Error('Too many sign-in attempts. Please wait before trying again.');
        }
        if (/email.*not.*confirm|confirm.*email|verify.*email/i.test(message)) {
            throw new Error('Please verify your account before signing in.');
        }
        throw new Error('Invalid username or password.');
    }
    if (requiresPendingEmailVerification(data.user)) {
        await supabaseClient.auth.signOut();
        throw new Error('Please verify your account before signing in.');
    }
    const profile = await ensureProfileForAuthUser(data.user);
    if (!profile) {
        await supabaseClient.auth.signOut();
        throw new Error('Your AptFindr profile could not be loaded. Please contact support.');
    }
    assertActiveAccount(profile);
    await recordLogin(profile, data.user.id, true, { username });
    persistCurrentUser(profile);
    return profile;
}
export async function resendSignupVerification(email) {
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail))
        throw new Error('Enter a valid email address.');
    const { error } = await supabaseClient.auth.resend({
        type: 'signup', email: normalizedEmail,
        options: { emailRedirectTo: buildAuthRedirect('/auth/callback') },
    });
    if (!error)
        return;
    console.error('[AUTH] Verification resend failed', { message: error.message, status: error.status, code: error.code });
    const details = `${error.code ?? ''} ${error.message}`;
    // The default Supabase sender refuses addresses outside the project team.
    if (/not.*authorized|unauthorized/i.test(details)) {
        throw new Error('Supabase is not allowed to email this address yet. Enable custom SMTP in Supabase → Authentication → Emails → SMTP Settings, then try again.');
    }
    if (/already.*confirm|already.*verif/i.test(details))
        throw new Error('This email is already verified. Try signing in or resetting your password.');
    if (error.status === 429 || /rate|too many|seconds/i.test(details))
        throw new Error('Too many verification emails were requested for this address. Wait a few minutes, then try again.');
    if (/smtp|mailer|email.*send|send.*email|confirmation.*email/i.test(details))
        throw new Error("We couldn't send the confirmation email right now. Please try again shortly.");
    if (/invalid.*email/i.test(details))
        throw new Error('Enter a valid email address.');
    throw new Error('The verification email could not be requested. Please try again later.');
}
// Password recovery and email verification keep their UI decisions in the auth pages.
export function requestPasswordResetEmail(email) {
    return supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: buildAuthRedirect('/reset-password'),
    });
}
export function exchangeAuthCode(code) {
    return supabaseClient.auth.exchangeCodeForSession(code);
}
export function getAuthSession() {
    return supabaseClient.auth.getSession();
}
export function getAuthUser() {
    return supabaseClient.auth.getUser();
}
export function updateAuthPassword(password) {
    return supabaseClient.auth.updateUser({ password });
}
export function signOutAuthSession() {
    return supabaseClient.auth.signOut();
}
/* ─── Continue with Google (Supabase OAuth) ────────────────────────────────
 * The Supabase client keeps its default implicit flow (the email confirmation
 * and password-reset links rely on it), so Google sends the new session back
 * in the URL fragment of /auth/callback and supabase-js stores it on load.
 * What the callback page still needs — sign-in or sign-up, the chosen role and
 * where to go next — is remembered in sessionStorage for this tab only.
 */
const OAUTH_INTENT_STORAGE_KEY = 'aptfindr:oauth-intent';
const OAUTH_INTENT_MAX_AGE_MS = 30 * 60 * 1000;
const GOOGLE_SETUP_HINT = 'Turn it on in Supabase → Authentication → Sign In / Providers → Google (Client ID and Client Secret from a Google Cloud "Web application" OAuth client), then add this site\'s /auth/callback URL under Authentication → URL Configuration → Redirect URLs.';
/** A same-site path such as "/browse"; never "//other.site" or a full URL. */
export function getSafeRedirectPath(value) {
    if (typeof value !== 'string')
        return null;
    const path = value.trim();
    return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\') ? path : null;
}
/** Where a freshly signed-in user lands (same rules as the sign-in form). */
export function getPostSignInPath(user, requestedRedirect = null) {
    const redirect = getSafeRedirectPath(requestedRedirect);
    if (redirect)
        return redirect;
    if (user?.role === 'admin')
        return '/admin';
    return isTenantRole(user?.role) ? '/browse' : '/dashboard';
}
function getSessionStorage() {
    try {
        return typeof window === 'undefined' ? null : window.sessionStorage;
    }
    catch {
        // Storage blocked by privacy settings: the callback falls back to the
        // sign-in method recorded in the session itself.
        return null;
    }
}
function saveOAuthIntent(intent) {
    try {
        getSessionStorage()?.setItem(OAUTH_INTENT_STORAGE_KEY, JSON.stringify(intent));
    }
    catch {
        // Google sign-in still works; only the chosen role and return page are lost.
    }
}
export function readOAuthIntent() {
    let raw = null;
    try {
        raw = getSessionStorage()?.getItem(OAUTH_INTENT_STORAGE_KEY) ?? null;
    }
    catch {
        raw = null;
    }
    if (!raw)
        return null;
    try {
        const parsed = JSON.parse(raw);
        if (!isRecord(parsed) || parsed.provider !== 'google' || typeof parsed.startedAt !== 'number')
            return null;
        if (Date.now() - parsed.startedAt > OAUTH_INTENT_MAX_AGE_MS)
            return null;
        const role = normalizeRoleValue(parsed.role);
        return {
            provider: 'google',
            intent: parsed.intent === 'signup' ? 'signup' : 'signin',
            role: PUBLIC_SIGNUP_ROLES.has(role) ? role : null,
            redirectTo: getSafeRedirectPath(parsed.redirectTo),
            startedAt: parsed.startedAt,
        };
    }
    catch {
        return null;
    }
}
export function clearOAuthIntent() {
    try {
        getSessionStorage()?.removeItem(OAUTH_INTENT_STORAGE_KEY);
    }
    catch {
        // Nothing to clean up when storage is unavailable.
    }
}
function decodeJwtPayload(token) {
    if (typeof token !== 'string')
        return null;
    const payload = token.split('.')[1];
    if (!payload)
        return null;
    try {
        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
        return JSON.parse(new TextDecoder().decode(bytes));
    }
    catch {
        return null;
    }
}
/**
 * Supabase records how a session was created in the access token's "amr"
 * claim: "oauth" for Google, "otp" / "email/signup" for email links and
 * "password" for the username sign-in form.
 */
export function isOAuthSession(session) {
    const claims = decodeJwtPayload(session?.access_token);
    return Array.isArray(claims?.amr) && claims.amr.some((entry) => isRecord(entry) && entry.method === 'oauth');
}
function isOAuthAuthUser(authUser) {
    const provider = typeof authUser?.app_metadata?.provider === 'string' ? authUser.app_metadata.provider.toLowerCase() : '';
    return provider !== '' && provider !== 'email' && provider !== 'phone';
}
async function assertGoogleProviderEnabled() {
    const settings = await fetchAuthSettings();
    // Unknown (offline, blocked, older Auth server): let Supabase decide.
    if (!isRecord(settings) || !isRecord(settings.external) || settings.external.google !== false)
        return;
    console.error(`[AUTH] Google sign-in is turned off for this Supabase project. ${GOOGLE_SETUP_HINT}`);
    throw new Error("Continue with Google isn't available right now. Please use the form below instead.");
}
/**
 * Sends the browser to Google through Supabase Auth. Resolves just before the
 * page unloads; rejects (without leaving the page) when sign-in cannot start.
 */
export async function signInWithGoogle({ intent = 'signin', role = null, redirectTo = null } = {}) {
    await assertGoogleProviderEnabled();
    const normalizedRole = normalizeRoleValue(role);
    saveOAuthIntent({
        provider: 'google',
        intent: intent === 'signup' ? 'signup' : 'signin',
        role: PUBLIC_SIGNUP_ROLES.has(normalizedRole) ? normalizedRole : null,
        redirectTo: getSafeRedirectPath(redirectTo),
        startedAt: Date.now(),
    });
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
            // The same callback page as email verification, so the Redirect URL
            // that is already allow-listed in Supabase keeps working.
            redirectTo: buildAuthRedirect('/auth/callback'),
            // People with several Google accounts can pick the right one.
            queryParams: { prompt: 'select_account' },
        },
    });
    if (error) {
        clearOAuthIntent();
        console.error('[AUTH] Google sign-in could not start', { message: error.message, status: error.status, code: error.code });
        throw new Error('Google sign-in could not be started. Please try again.');
    }
    return data;
}
/** Friendly text for the error Supabase adds to /auth/callback after a failed Google sign-in. */
export function describeGoogleSignInError(params) {
    const error = (params.get('error') ?? '').toLowerCase();
    const code = (params.get('error_code') ?? '').toLowerCase();
    const description = params.get('error_description') ?? '';
    console.error('[AUTH] Google sign-in was rejected', { error, code, description });
    if (/database error saving new user/i.test(description)) {
        console.error('[AUTH] New Google accounts are blocked by the database signup trigger. Run scripts/database/google_oauth_signup.sql in the Supabase SQL Editor.');
        return "We couldn't create your AptFindr account with Google yet. Please try again later, or sign up with your email instead.";
    }
    if (code === 'signup_disabled' || /signups? not allowed/i.test(description))
        return "New accounts can't be created right now. If you already have an AptFindr account, sign in with your username and password.";
    if (code === 'provider_email_needs_verification' || /unverified email/i.test(description))
        return 'Confirm the email address of your Google account first (check your inbox for a confirmation email), then try again.';
    if (error === 'access_denied')
        return 'Google sign-in was cancelled. You can try again or use your username and password.';
    if (code === 'bad_oauth_state' || code === 'bad_oauth_callback' || /oauth state/i.test(description))
        return 'Your Google sign-in expired or was opened in another tab. Please try again.';
    if (/email/i.test(description) && /external provider|missing|not provided/i.test(description))
        return "Google didn't share your email address with AptFindr. Allow access to your email and try again.";
    return 'Google sign-in could not be completed. Please try again.';
}
function describeOAuthAccount(authUser) {
    const metadata = isRecord(authUser.user_metadata) ? authUser.user_metadata : {};
    return {
        email: authUser.email ?? '',
        name: getStringValue(metadata, ['full_name', 'name']).trim(),
        avatarUrl: getStringValue(metadata, ['avatar_url', 'picture']),
    };
}
/**
 * Finishes a Google sign-in on /auth/callback once supabase-js has stored the
 * session. Returns { status: 'signed_in', user } for an existing AptFindr
 * account, or { status: 'needs_profile', account } for an explicit Google
 * signup with a selected role. Unregistered sign-in users are signed out.
 */
export async function resolveOAuthSignIn() {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error)
        console.error('[AUTH] Google sign-in session could not be read', { message: error.message });
    const authUser = data?.session?.user;
    if (error || !authUser)
        throw new Error('Google sign-in could not be completed. Please try again.');
    if (requiresPendingEmailVerification(authUser)) {
        await supabaseClient.auth.signOut();
        throw new Error('Confirm the email address of your Google account first, then try again.');
    }
    const intent = readOAuthIntent();
    // Signup must not silently log into (or relink) an existing account.
    // Check both identifiers before the profile resolver performs any writes.
    if (intent?.intent === 'signup') {
        const existing = await fetchUserByAuthId(authUser.id)
            || (authUser.email ? await fetchUserByEmail(authUser.email) : null);
        if (existing) {
            latestAuthProfileRequestId += 1;
            clearOAuthIntent();
            await supabaseClient.auth.signOut();
            throw new Error('An account with this email already exists. Please sign in instead.');
        }
    }
    const profile = await ensureProfileForAuthUser(authUser, { createIfMissing: false });
    if (!profile) {
        // Only the explicit Create Account flow may onboard a new Google user.
        // Missing/expired intent must not silently turn sign-in into signup.
        if (intent?.intent !== 'signup' || !PUBLIC_SIGNUP_ROLES.has(intent.role)) {
            clearOAuthIntent();
            await supabaseClient.auth.signOut();
            throw new Error('No AptFindr account is linked to this Google email. Create an account first.');
        }
        return { status: 'needs_profile', account: describeOAuthAccount(authUser) };
    }
    try {
        assertActiveAccount(profile);
    }
    catch (inactiveError) {
        await supabaseClient.auth.signOut();
        throw inactiveError;
    }
    // Profile lookups started by earlier auth events must not overwrite this.
    latestAuthProfileRequestId += 1;
    await recordLogin(profile, authUser.id, true, { provider: 'google' });
    persistCurrentUser(profile);
    return { status: 'signed_in', user: profile };
}
function mapOAuthSignupError(error) {
    const message = error?.message ?? '';
    const code = error?.code ?? '';
    console.error('[AUTH] Google account setup failed', { message, code, details: error?.details, hint: error?.hint });
    if (code === 'PGRST202' || /fn_complete_oauth_signup/i.test(message)) {
        console.error('[AUTH] The fn_complete_oauth_signup database function is missing. Run scripts/database/google_oauth_signup.sql in the Supabase SQL Editor.');
        return new Error("Google sign-up isn't fully set up yet. Please try again later, or sign up with your email instead.");
    }
    // Messages raised by fn_complete_oauth_signup itself are written for people.
    if (code === 'P0001' && message)
        return new Error(message);
    if (code === '42501' || /jwt|not authenticated/i.test(message))
        return new Error('Your Google sign-in has expired. Please continue with Google again.');
    if (/fetch|network|connection/i.test(message))
        return new Error('We could not reach the account service. Check your connection and try again.');
    return new Error('We could not finish creating your account. Please try again.');
}
/**
 * Creates the AptFindr profile for a first-time Google user after they choose
 * Tenant or Landlord and accept the terms (fn_complete_oauth_signup RPC).
 */
export async function completeOAuthSignup(details = {}) {
    const role = normalizeRoleValue(details.role);
    if (!PUBLIC_SIGNUP_ROLES.has(role))
        throw new Error('Choose Tenant or Landlord to finish creating your account.');
    if (details.termsAccepted !== true)
        throw new Error('You must agree to the Terms of Use and Privacy Policy to continue.');
    const isLandlord = role === 'landlord';
    if (isLandlord) {
        if (details.landlordVerificationAccepted !== true)
            throw new Error('You must agree to the Terms of Use and Landlord Verification Policy to continue.');
        if (!nonEmptyString(details.name))
            throw new Error('Full name is required.');
        if (!nonEmptyString(details.mobile))
            throw new Error('Mobile number is required.');
        if (!nonEmptyString(details.address))
            throw new Error('Home address is required.');
        if (!nonEmptyString(details.permitNumber))
            throw new Error('Business permit number is required.');
    }
    const { data, error } = await supabaseClient.rpc('fn_complete_oauth_signup', {
        p_role: role,
        p_terms_accepted: true,
        p_landlord_verification_accepted: isLandlord,
        p_name: nonEmptyString(details.name),
        p_mobile: isLandlord ? nonEmptyString(details.mobile) : null,
        p_address: isLandlord ? nonEmptyString(details.address) : null,
        p_permit_number: isLandlord ? nonEmptyString(details.permitNumber) : null,
    });
    if (error)
        throw mapOAuthSignupError(error);
    const profile = normalizeUser(Array.isArray(data) ? data[0] : data);
    if (!profile.id) {
        console.error('[AUTH] fn_complete_oauth_signup returned no profile');
        throw new Error('We could not finish creating your account. Please try again.');
    }
    assertValidRole(profile.role);
    assertActiveAccount(profile);
    latestAuthProfileRequestId += 1;
    await recordLogin(profile, profile.authId ?? null, true, { provider: 'google', signup: true });
    persistCurrentUser(profile);
    return profile;
}
export async function updateUser(userId, updates) {
    if (typeof updates.password === 'string' && updates.password.length > 0) {
        const { error } = await supabaseClient.auth.updateUser({ password: updates.password });
        if (error) {
            throw new Error(error.message);
        }
    }
    const payload = toUserPayload(updates);
    const existing = await fetchUserById(userId);
    if (!existing) {
        throw new Error('User profile not found.');
    }
    if (Object.keys(payload).length === 0) {
        await ensureRoleProfile(userId, existing.role, updates);
        return existing;
    }
    const { data, error } = await supabaseClient.from(APP_USERS_TABLE).update(payload).eq('id', userId).select('*').single();
    if (error) {
        throw new Error(error.message);
    }
    const user = normalizeUser(data);
    await ensureRoleProfile(user.id, user.role, { ...updates, isVerified: user.isVerified });
    persistCurrentUser(user);
    return user;
}
export async function deleteUser(userId) {
    const current = await getCurrentAuthenticatedUser();
    if (!current || current.id !== userId) {
        throw new Error('You can only delete your own account from this screen.');
    }
    const { error } = await supabaseClient.rpc('fn_delete_my_account');
    if (error) {
        throw new Error(error.message);
    }
    await supabaseClient.auth.signOut();
    persistCurrentUser(null);
}
export async function logoutUser() {
    latestAuthProfileRequestId += 1;
    persistCurrentUser(null);
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        throw new Error(error.message);
    }
    persistCurrentUser(null);
}
export async function verifyLandlord(userId, verified = true) {
    const { error } = await supabaseClient.rpc('fn_set_landlord_verification', {
        p_landlord_id: userId,
        p_verified: verified,
    });
    if (error) {
        throw new Error(error.message);
    }
    const user = await fetchUserById(userId);
    if (!user) {
        throw new Error('Landlord account not found after verification update.');
    }
    return user;
}
export async function getPendingLandlordCount() {
    const { data, error } = await supabaseClient.from('public_landlords').select('is_verified');
    if (error) {
        throw new Error(error.message);
    }
    return (data ?? []).filter((row) => row.is_verified !== true).length;
}
