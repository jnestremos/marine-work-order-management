-- Policies run as the anon role, so that role must be able to call the session helpers.
-- Trigger functions stay revoked.

grant execute on function
  private.session_member_id(),
  private.session_role(),
  private.session_vessel_id(),
  private.is_admin(),
  private.is_captain(),
  private.is_crew(),
  private.assigned_to_vessel(uuid, uuid),
  private.can_see_work_order(uuid)
to anon;
