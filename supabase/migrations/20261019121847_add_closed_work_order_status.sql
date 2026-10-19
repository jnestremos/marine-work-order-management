-- Terminal work-order status after Attest or Reject.
alter type public.work_order_status add value if not exists 'closed';
