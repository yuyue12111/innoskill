import { getDb } from "./db";
import { skillExists, SKILL_SUMMARY_SQL, toSummary, type SkillRow, type SkillSummary } from "./catalog";

/** InnoAgent 传来的用户标识:字符串,只做形态校验,不做外键 */
export function isValidUserId(uid: string): boolean {
	return /^[A-Za-z0-9_.:@-]{1,128}$/.test(uid);
}

export interface InstallItem { skill: SkillSummary; installedAt: string; uninstalledAt: string | null }

export function listInstalls(uid: string, history = false): InstallItem[] {
	const rows = getDb().prepare(
		`SELECT ${SKILL_SUMMARY_SQL.select}, ui.installed_at, ui.uninstalled_at
		 FROM user_install ui JOIN skill s ON s.id = ui.skill_id ${SKILL_SUMMARY_SQL.statJoin}
		 WHERE ui.user_id = ? ${history ? "" : "AND ui.uninstalled_at IS NULL"}
		 ORDER BY ui.installed_at DESC`,
	).all(uid) as unknown as Array<SkillRow & { installed_at: string; uninstalled_at: string | null }>;
	return rows.map((r) => ({ skill: toSummary(r), installedAt: r.installed_at, uninstalledAt: r.uninstalled_at }));
}

/** 重算若干技能的安装人数(未卸载的去重用户数) */
function refreshStats(skillIds: string[]): void {
	const db = getDb();
	const stmt = db.prepare(`
		INSERT INTO skill_stat (skill_id, install_count, view_count)
		VALUES (?, (SELECT COUNT(DISTINCT user_id) FROM user_install WHERE skill_id = ? AND uninstalled_at IS NULL), 0)
		ON CONFLICT(skill_id) DO UPDATE SET install_count = excluded.install_count`);
	for (const id of skillIds) stmt.run(id, id);
}

/** 幂等安装:已装的保持原 installed_at;卸载过的重新激活 */
export function installSkills(uid: string, skillIds: string[]): { installed: string[]; alreadyInstalled: string[]; unknown: string[] } {
	const db = getDb();
	const now = new Date().toISOString();
	const installed: string[] = [], already: string[] = [], unknown: string[] = [];
	const active = db.prepare("SELECT 1 FROM user_install WHERE user_id = ? AND skill_id = ? AND uninstalled_at IS NULL");
	const upsert = db.prepare(`
		INSERT INTO user_install (user_id, skill_id, installed_at, uninstalled_at) VALUES (?, ?, ?, NULL)
		ON CONFLICT(user_id, skill_id) DO UPDATE SET installed_at = excluded.installed_at, uninstalled_at = NULL`);
	db.exec("BEGIN");
	try {
		for (const id of new Set(skillIds)) {
			if (!skillExists(id)) { unknown.push(id); continue; }
			if (active.get(uid, id)) { already.push(id); continue; }
			upsert.run(uid, id, now); installed.push(id);
		}
		refreshStats(installed);
		db.exec("COMMIT");
	} catch (e) { db.exec("ROLLBACK"); throw e; }
	return { installed, alreadyInstalled: already, unknown };
}

export function uninstallSkill(uid: string, skillId: string): boolean {
	const db = getDb();
	const r = db.prepare("UPDATE user_install SET uninstalled_at = ? WHERE user_id = ? AND skill_id = ? AND uninstalled_at IS NULL").run(new Date().toISOString(), uid, skillId);
	if (r.changes > 0) refreshStats([skillId]);
	return r.changes > 0;
}

export function recordView(skillId: string): void {
	if (!skillExists(skillId)) return;
	getDb().prepare("INSERT INTO skill_stat (skill_id, install_count, view_count) VALUES (?, 0, 1) ON CONFLICT(skill_id) DO UPDATE SET view_count = view_count + 1").run(skillId);
}

export function allStats(): Array<{ id: string; installCount: number; viewCount: number }> {
	return (getDb().prepare("SELECT s.id, COALESCE(st.install_count, 0) AS install_count, COALESCE(st.view_count, 0) AS view_count FROM skill s LEFT JOIN skill_stat st ON st.skill_id = s.id ORDER BY install_count DESC, view_count DESC, s.id").all() as unknown as Array<{ id: string; install_count: number; view_count: number }>)
		.map((r) => ({ id: r.id, installCount: r.install_count, viewCount: r.view_count }));
}
