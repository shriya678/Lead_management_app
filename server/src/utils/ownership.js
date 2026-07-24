function isMemberOwner(lead, user) {
  if (!lead || !user || !lead.assignedTo) return false;
  const assignee = lead.assignedTo;
  const assigneeId =
    typeof assignee === 'object' && assignee._id
      ? assignee._id.toString()
      : assignee.toString();
  return assigneeId === user.id;
}

module.exports = { isMemberOwner };
