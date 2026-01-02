import { redirect } from "next/navigation";

/**
 * Legacy page for adding transactions.
 *
 * This page has been replaced by the quick-add modal accessible via the FAB
 * on the transactions page. This redirect ensures that any bookmarks or
 * existing links to /transactions/new continue to work.
 *
 * Users are redirected to the main transactions page where they can:
 * - Use the FAB (Floating Action Button) to open the quick-add modal
 * - View and manage all their transactions
 */
export default function NewTransactionPage() {
  redirect("/transactions");
}
