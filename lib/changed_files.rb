# frozen_string_literal: true

# Shared file discovery for the pack's checks.
#
# This was deliberately duplicated while a check was hand-copied one file at a
# time into a repo's bin/ — a self-contained script was the unit of
# distribution, so a shared lib would simply not have arrived. The pack vendors
# the whole directory at once, which retired that constraint and left five
# identical copies plus one that had already drifted: check-comments knew only
# `main` while its siblings also fell back to `master`, so on a master-branch
# repo one rule silently scanned a different set of files than the rest.
module Highball
  module_function

  def ref_exists?(ref)
    system("git rev-parse -q --verify #{ref}", out: File::NULL, err: File::NULL)
  end

  # "Changed" means everything the branch touches that the base branch doesn't
  # have: committed branch work, staged and unstaged edits, and brand-new
  # untracked files. Agents run against dirty trees, so the dirty state is the
  # point. Every git call degrades gracefully — a fresh repo with no commits,
  # or no base branch yet, simply widens toward "everything".
  def changed_files
    # The runner computes this once on the host and hands it down (ADR
    # 202608), so a rule running inside a container needs neither git nor repo
    # history. Empty or absent means "unknown" — fall back to asking git.
    provided = ENV["HIGHBALL_CHANGED_FILES"].to_s
    unless provided.strip.empty?
      return provided.lines.map(&:strip).reject(&:empty?).uniq
    end

    parts = [ `git diff --name-only`, `git ls-files --others --exclude-standard` ]
    if ref_exists?("HEAD")
      parts << `git diff --name-only --cached`
      base = %w[origin/main main origin/master master].find { |ref| ref_exists?(ref) }
      parts << `git diff --name-only #{`git merge-base #{base} HEAD`.strip} HEAD` if base
    end
    parts.flat_map(&:lines).map(&:strip).uniq
  end

  # Every file git knows about, tracked or not. The full-repo mode for rules
  # that support one — run without --changed-only for the whole picture.
  def all_files
    `git ls-files --cached --others --exclude-standard`.lines.map(&:strip).uniq
  end
end
