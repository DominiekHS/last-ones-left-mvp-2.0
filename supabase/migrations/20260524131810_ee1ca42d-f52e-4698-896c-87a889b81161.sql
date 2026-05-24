UPDATE auth.users
SET email = 'adminlastonesleft@gmail.com',
    email_change = '',
    email_change_token_new = '',
    email_change_token_current = '',
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE id = 'b6c6a0a9-7dd4-44f7-bc5d-149fe52e1bbc';

UPDATE auth.identities
SET identity_data = jsonb_set(identity_data, '{email}', '"adminlastonesleft@gmail.com"'),
    updated_at = now()
WHERE user_id = 'b6c6a0a9-7dd4-44f7-bc5d-149fe52e1bbc';

UPDATE public.profiles
SET email = 'adminlastonesleft@gmail.com', updated_at = now()
WHERE user_id = 'b6c6a0a9-7dd4-44f7-bc5d-149fe52e1bbc';