# LabId Removal Summary

## Status: In Progress

This document tracks the removal of `labId` from the codebase as the LIMS is now single-lab (biomolecular laboratory only).

## Completed
- ✅ Removed `labId` from all type definitions in `src/lib/types.ts`
- ✅ Removed `labId` from `CustomClaims` interface in `src/firebase/auth/use-user.tsx`
- ✅ Removed `labId` from user profile creation in `src/app/login/page.tsx`
- ✅ Fixed main dashboard page queries
- ✅ Fixed samples page queries and document creation
- ✅ Fixed projects page queries and document creation
- ✅ Fixed experiments page queries and document creation
- ✅ Fixed dna-extracts page queries and document creation
- ✅ Fixed tasks page document creation

## Remaining Issues

### TypeScript Errors to Fix:
1. **User.claims access pattern**: Many files use `user.claims?.labId` but should use `claims` from `useUser()` hook directly
   - Pattern: `const { user, claims } = useUser();` then use `claims?.role` not `user.claims?.role`

2. **Missing createdById**: Many dialog components need to add `createdById: user.uid` when creating documents

3. **Remaining labId references**: Still found in:
   - Equipment pages
   - Inventory pages  
   - Protocol pages
   - Shipment pages
   - Experiment detail pages
   - Task detail pages
   - Audit log pages
   - Various dialog components

### Files Needing Fixes:
- All dialog components in `_components/` folders
- Detail pages (`[id]/page.tsx`)
- Remaining list pages

## Next Steps
1. Fix `user.claims` → `claims` pattern throughout
2. Add `createdById` to all document creation operations
3. Remove remaining `labId` references
4. Run full typecheck and fix all errors
5. Test all CRUD operations

