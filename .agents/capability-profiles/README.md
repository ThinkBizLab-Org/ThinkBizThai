# Capability declarations

Each JSON file in this directory is a declaration for one real `agent_run_id`
and conforms to `../capabilities.schema.json`. It is distinct from the stable
role directory: a role name is never evidence that a run has the needed skill.

A declaration is not, by itself, a capability benchmark, external approval, or
cross-vendor dry run. Before a work package becomes `ready`, the dispatcher must
match its `required_skill_profiles` to real declarations and their cited
evidence, then record distinct assigned run IDs in the manifest.

If a run cannot write this directory, its declaration may be transcribed by A0
only from values explicitly supplied by that run; the declaration must record
that origin and must not overstate unavailable tools or authority.
