-- 일일 보너스 시스템 추가 SQL
-- Supabase 대시보드의 SQL Editor에서 실행하세요

-- 1. profiles 테이블에 next_daily_bonus_at 컬럼 추가 (이미 존재하지 않으면)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS next_daily_bonus_at timestamptz;

-- 2. 일일 보너스 함수 생성
CREATE OR REPLACE FUNCTION public.claim_daily_bonus()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_profile.next_daily_bonus_at IS NOT NULL AND v_profile.next_daily_bonus_at > now() THEN
    RETURN jsonb_build_object(
      'ok', false,
      'coins', v_profile.coins,
      'next_daily_bonus_at', v_profile.next_daily_bonus_at
    );
  END IF;

  UPDATE public.profiles
  SET coins = coins + 200,
      next_daily_bonus_at = now() + interval '24 hours',
      updated_at = now()
  WHERE id = v_user_id
  RETURNING * INTO v_profile;

  RETURN jsonb_build_object(
    'ok', true,
    'coins', v_profile.coins,
    'next_daily_bonus_at', v_profile.next_daily_bonus_at
  );
END;
$$;

-- 3. 함수 권한 설정
REVOKE ALL ON FUNCTION public.claim_daily_bonus() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_bonus() TO authenticated;

-- 4. 검증 쿼리
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name = 'claim_daily_bonus';

-- 5. 테이블 컬럼 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'next_daily_bonus_at';
