export function resolveLeadFormBranchId({ editingLead, isSuperAdmin, filterBranch, currentUserBranchId, activeBranches }) {
  // Düzenleme sırasında üstteki rapor filtresi değil, kaydın gerçek şubesi belirleyicidir.
  if (editingLead?.branch_id) return editingLead.branch_id
  if (!isSuperAdmin) return currentUserBranchId || null
  return filterBranch !== 'all' ? filterBranch : (activeBranches[0]?.id || null)
}

export function leadServiceOptions(services = [], currentService = '') {
  const options = Array.isArray(services) ? services : []
  if (!currentService || options.some(service => service.name === currentService)) return options
  // Hizmet listeden kaldırılmış olsa bile eski kaydın hizmeti boşaltılmaz.
  return [{ id: `existing:${currentService}`, name: currentService }, ...options]
}

export function leadServiceSelection(services, currentService, editing = false) {
  if (editing) return currentService
  const options = Array.isArray(services) ? services : []
  return options.some(service => service.name === currentService) ? currentService : (options[0]?.name || '')
}
