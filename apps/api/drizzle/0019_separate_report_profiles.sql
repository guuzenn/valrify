-- Preserve the reported name instead of treating a shared contact as proof of identity.
LOCK TABLE reports, report_parties, report_identifiers, entity_identifiers, entities IN SHARE ROW EXCLUSIVE MODE;
--> statement-breakpoint
CREATE TEMP TABLE profile_splits ON COMMIT DROP AS
SELECT p.entity_id AS old_id,
  lower(regexp_replace(trim(p.display_name), '\s+', ' ', 'g')) AS name_key,
  min(trim(p.display_name)) AS display_name,
  nextval(pg_get_serial_sequence('entities', 'id'))::integer AS new_id
FROM report_parties p JOIN reports r ON r.id = p.report_id JOIN entities e ON e.id = p.entity_id
WHERE r.status = 'PUBLISHED' AND trim(p.display_name) <> ''
  AND lower(regexp_replace(trim(p.display_name), '\s+', ' ', 'g')) <> lower(regexp_replace(trim(e.display_name), '\s+', ' ', 'g'))
GROUP BY p.entity_id, lower(regexp_replace(trim(p.display_name), '\s+', ' ', 'g'));
--> statement-breakpoint
CREATE TEMP TABLE report_profile_splits ON COMMIT DROP AS
SELECT p.report_id, p.position, s.* FROM report_parties p
JOIN reports r ON r.id = p.report_id AND r.status = 'PUBLISHED'
JOIN profile_splits s ON s.old_id = p.entity_id AND s.name_key = lower(regexp_replace(trim(p.display_name), '\s+', ' ', 'g'));
--> statement-breakpoint
INSERT INTO entities(id, slug, display_name)
SELECT new_id, coalesce(nullif(trim(both '-' from regexp_replace(lower(display_name), '[^a-z0-9]+', '-', 'g')), ''), 'profil') || '-' || new_id, display_name FROM profile_splits;
--> statement-breakpoint
UPDATE report_identifiers ri SET entity_id = s.new_id FROM report_profile_splits s, reports r
WHERE r.id = s.report_id AND ri.report_id = s.report_id AND coalesce(ri.entity_id, r.entity_id) = s.old_id;
--> statement-breakpoint
UPDATE report_parties p SET entity_id = s.new_id FROM report_profile_splits s WHERE p.report_id = s.report_id AND p.entity_id = s.old_id;
--> statement-breakpoint
UPDATE reports r SET entity_id = s.new_id FROM report_profile_splits s WHERE r.id = s.report_id AND s.position = 0;
--> statement-breakpoint
UPDATE reports r SET updated_at = greatest(now(), r.updated_at + interval '1 millisecond') WHERE EXISTS (SELECT 1 FROM report_profile_splits s WHERE s.report_id = r.id);
--> statement-breakpoint
INSERT INTO entity_identifiers(entity_id, identifier_id)
SELECT DISTINCT ri.entity_id, ri.identifier_id FROM report_identifiers ri JOIN report_profile_splits s ON s.report_id = ri.report_id AND s.new_id = ri.entity_id ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO report_status_history(report_id, from_status, to_status, actor_id, note)
SELECT report_id, 'PUBLISHED', 'PUBLISHED', NULL,
  'Koreksi sistem: nama pihak ' || display_name || ' dipisahkan dari profil #' || old_id || ' ke profil #' || new_id || '. Laporan dan bukti dipertahankan; kesamaan kontak tidak menggabungkan identitas.'
FROM report_profile_splits;
