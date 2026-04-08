-- vonBusch CRM · Vollständiger Seed
-- Löscht alle bestehenden Daten und lädt frische Musterdaten

-- Reihenfolge beachten wegen Foreign Keys
DELETE FROM sync_log;
DELETE FROM documents;
DELETE FROM contracts;
DELETE FROM tickets;
DELETE FROM activity_attendees;
DELETE FROM activities;
DELETE FROM deals;
DELETE FROM contacts;
DELETE FROM companies;
DELETE FROM users;

-- ══════════════════════════════════════════════
-- USERS (Mitarbeiter)
-- ══════════════════════════════════════════════
INSERT INTO users (id,email,display_name,role,team,active,employee_number,created_at) VALUES
('usr-vb',  'victor.vonbusch@vonbusch.digital',   'Victor von Busch',    'admin',        'Management',      1,'101','2024-01-01T00:00:00Z'),
('usr-sf',  'stefan.vonbusch@vonbusch.digital',    'Stefan F.W. von Busch','admin',       'Management',      1,'102','2024-01-01T00:00:00Z'),
('usr-zf',  'ziad.ferjani@vonbusch.digital',       'Ziad Ferjani',        'sales_manager','Service',         1,'115','2024-01-01T00:00:00Z'),
('usr-mb',  'michael.burmeister@vonbusch.digital', 'Michael Burmeister',  'sales_manager','Einkauf',         1,'134','2024-01-01T00:00:00Z'),
('usr-df',  'dirk.fuhrmann@vonbusch.digital',      'Dirk Fuhrmann',       'readonly',     'Buchhaltung',     1,'145','2024-01-01T00:00:00Z'),
('usr-ae',  'arne.elges@vonbusch.digital',         'Arne Elges',          'sales_manager','Administration',  1,'156','2024-01-01T00:00:00Z'),
('usr-lk',  'leif.krahmueeller@vonbusch.digital',  'Leif Krahmüller',     'sales_manager','Robotik',         1,'167','2024-01-01T00:00:00Z'),
('usr-db2', 'dennis.berger@vonbusch.digital',      'Dennis Berger',       'sales',        'POM',             1,'178','2024-01-01T00:00:00Z'),
('usr-aw',  'axel.weichert@vonbusch.digital',      'Axel Weichert',       'sales_manager','ITS',             1,'120','2024-01-01T00:00:00Z'),
('usr-hb2', 'henri.beckmann@vonbusch.digital',     'Henri Beckmann',      'sales',        'ITS',             1,'189','2024-01-01T00:00:00Z'),
('usr-hd',  'hannah.dehnke@vonbusch.digital',      'Hannah Dehnke',       'sales',        'ITS',             1,'190','2024-01-01T00:00:00Z'),
('usr-hbr', 'henning.brinker@vonbusch.digital',    'Henning Brinker',     'sales',        'ITS',          1,'201','2024-01-01T00:00:00Z'),
('usr-mm',  'maik.murwig@vonbusch.digital',        'Maik Murwig',         'sales',        'POM',             1,'212','2024-01-01T00:00:00Z'),
('usr-kf',  'katharina.franke@vonbusch.digital',   'Katharina Franke',    'sales_manager','POM',         1,'223','2024-01-01T00:00:00Z'),
('usr-ak2', 'alexander.kuhl@vonbusch.digital',     'Alexander Kuhl',      'sales',        'POM',             1,'234','2024-01-01T00:00:00Z'),
('usr-cd',  'claus.dueck@vonbusch.digital',        'Claus Dueck',         'sales',        'POM',             1,'245','2024-01-01T00:00:00Z'),
('usr-ce',  'claudia.eren@vonbusch.digital',       'Claudia Eren',        'sales',        'KAM',             1,'256','2024-01-01T00:00:00Z'),
('usr-rb',  'ralf.busche@vonbusch.digital',        'Ralf Busche',         'sales_manager','Digitaldruckerei',1,'267','2024-01-01T00:00:00Z'),
('usr-pn',  'peter.niemann@vonbusch.digital',      'Peter Niemann',       'support',      'Dispatching',     1,'278','2024-01-01T00:00:00Z'),
('usr-gp',  'guido.pruessner@vonbusch.digital',    'Guido Prüßner',       'support',      'Dispatching',     1,'289','2024-01-01T00:00:00Z'),
('usr-mh',  'mario.hysa@vonbusch.digital',         'Mario Hysa',          'support',      'POM',             1,'300','2024-01-01T00:00:00Z'),
('usr-so',  'sandro.ortega@vonbusch.digital',     'Sandro Ortega',       'sales',        'ITS',             1,'311','2024-01-01T00:00:00Z'),
('usr-ar',  'anchana.ravi@vonbusch.digital',       'Anchana Ravi',        'readonly',     'HR',              1,'322','2024-01-01T00:00:00Z'),
('usr-lw',  'lilian.weers@vonbusch.digital',       'Lilian Weers',        'readonly',     'Marketing',       1,'333','2024-01-01T00:00:00Z');

-- ══════════════════════════════════════════════
-- COMPANIES (20 Firmen)
-- ══════════════════════════════════════════════
INSERT INTO companies (id,name,status,bereich,street,zip,city,country,phone,email,website,account_manager_id,erp_id,created_at,updated_at) VALUES
('co-01','Logistik Weser KG',        'customer','AutoID',          'Industriestr. 12',  '33334','Gütersloh', 'DE','+49 5241 884-0',  'info@logistik-weser.de',  'https://logistik-weser.de',  'usr-hbr','10001','2023-03-15T00:00:00Z','2024-03-01T00:00:00Z'),
('co-02','Kanzlei Brandt & Partner', 'prospect','eWLAN',           'Niederwall 12',     '33602','Bielefeld', 'DE','+49 521 9944-0',  'office@brandt-kanzlei.de','https://brandt-kanzlei.de',  'usr-hb2','10002','2024-02-01T00:00:00Z','2024-03-15T00:00:00Z'),
('co-03','Druckerei Müller AG',       'customer','POM',             'Druckweg 5',        '33335','Gütersloh', 'DE','+49 5241 7711-0', 'info@druckerei-mueller.de','https://druckerei-mueller.de','usr-mm', '10003','2023-06-01T00:00:00Z','2024-04-01T00:00:00Z'),
('co-04','Klinikum OWL gGmbH',       'prospect','Robotik',         'Röntgenstr. 18',    '32756','Detmold',   'DE','+49 5231 72-0',   'info@klinikum-owl.de',    'https://klinikum-owl.de',    'usr-lk', '10004','2024-03-01T00:00:00Z','2024-03-30T00:00:00Z'),
('co-05','Stadtwerke Herford AöR',   'customer','Cloudflare',      'Am Wasserwerk 3',   '32052','Herford',   'DE','+49 5221 188-0',  'it@stadtwerke-herford.de','https://stadtwerke-herford.de','usr-aw', '10005','2023-09-10T00:00:00Z','2024-04-01T00:00:00Z'),
('co-06','Hotel Ravensberger Hof',   'customer','eWLAN',           'Artur-Ladebeck-Str. 123','33647','Bielefeld','DE','+49 521 5244-0','info@ravensberger.de',  'https://ravensberger.de',    'usr-hd', '10006','2023-01-15T00:00:00Z','2024-03-28T00:00:00Z'),
('co-07','Lager Westfalia GmbH',     'customer','ITS',          'Versmolder Str. 45','33378','Rheda-Wiedenbrück','DE','+49 5242 9900-0','lager@westfalia-gmbh.de','https://westfalia-gmbh.de','usr-hbr','10007','2022-05-01T00:00:00Z','2024-03-30T00:00:00Z'),
('co-08','Messe Bielefeld GmbH',     'customer','LFP',             'Messeplatz 1',      '33689','Bielefeld', 'DE','+49 521 9100-0',  'info@messe-bielefeld.de','https://messe-bielefeld.de', 'usr-cd', '10008','2022-05-01T00:00:00Z','2024-03-31T00:00:00Z'),
('co-09','Autohaus Kemper GmbH',     'customer','POM',             'Paderborner Str. 88','33100','Paderborn','DE','+49 5251 8870-0', 'info@autohaus-kemper.de','https://autohaus-kemper.de', 'usr-db2','10009','2023-01-10T00:00:00Z','2024-02-20T00:00:00Z'),
('co-10','Schulzentrum Enger',        'customer','POM',             'Schulstr. 22',      '32130','Enger',     'DE','+49 5224 9710-0', 'verwaltung@sz-enger.de',  NULL,                         'usr-mm', '10010','2023-04-01T00:00:00Z','2024-01-15T00:00:00Z'),
('co-11','Fleischerei Dörner GmbH',  'customer','Digitaldruckerei','Fleischmarkt 3',    '32105','Bad Salzuflen','DE','+49 5222 7800-0','info@doerner-fleisch.de',NULL,                         'usr-rb', '10011','2023-07-01T00:00:00Z','2024-02-10T00:00:00Z'),
('co-12','EWG Energieversorgung AG', 'prospect','Cloudflare',      'Energiestr. 1',     '32423','Minden',    'DE','+49 571 8350-0',  'it@ewg-minden.de',        'https://ewg-minden.de',      'usr-aw', '10012','2024-01-15T00:00:00Z','2024-04-01T00:00:00Z'),
('co-13','Weser Kurier Verlag',      'customer','LFP',             'Annaplatz 2',       '32312','Lübbecke',  'DE','+49 5741 3300-0', 'druck@weser-kurier.de',   'https://weser-kurier.de',    'usr-cd', '10013','2022-11-01T00:00:00Z','2024-03-20T00:00:00Z'),
('co-14','Reinigungsservice Blitz',  'customer','Robotik',         'Gewerbepark 7',     '33647','Bielefeld', 'DE','+49 521 4440-0',  'info@blitz-reinigung.de', NULL,                         'usr-lk', '10014','2023-08-15T00:00:00Z','2024-04-02T00:00:00Z'),
('co-15','IT-Haus Paderborn GmbH',   'prospect','Proxmox',         'Technologiepark 12','33100','Paderborn', 'DE','+49 5251 6610-0', 'info@it-haus-pb.de',      'https://it-haus-pb.de',      'usr-ak2','10015','2024-02-10T00:00:00Z','2024-04-01T00:00:00Z'),
('co-16','Sportpark Brackwede GmbH', 'customer','eWLAN',           'Sportparkstr. 1',   '33647','Bielefeld', 'DE','+49 521 9200-0',  'info@sportpark-bw.de',    NULL,                         'usr-hd', '10016','2023-05-01T00:00:00Z','2024-02-28T00:00:00Z'),
('co-17','Lippstädter Metall GmbH',  'customer','ITS',          'Stahlweg 18',       '59555','Lippstadt', 'DE','+49 2941 9080-0', 'info@lippstaedter-metall.de',NULL,                       'usr-hbr','10017','2023-02-01T00:00:00Z','2024-03-15T00:00:00Z'),
('co-18','Kreishandwerkerschaft OWL','prospect','POM',             'Handwerkerstr. 5',  '32756','Detmold',   'DE','+49 5231 9620-0', 'info@khs-owl.de',         'https://khs-owl.de',         'usr-db2','10018','2024-01-20T00:00:00Z','2024-03-28T00:00:00Z'),
('co-19','Fachklinik Senne',         'customer','Proxmox',         'Klinikweg 12',      '33689','Bielefeld', 'DE','+49 521 4480-0',  'it@fachklinik-senne.de',  NULL,                         'usr-ak2','10019','2023-06-15T00:00:00Z','2024-03-10T00:00:00Z'),
('co-20','Werbewerkstatt Bielefeld', 'customer','Digitaldruckerei','Kreativstr. 8',     '33602','Bielefeld', 'DE','+49 521 5500-0',  'info@werbewerkstatt-bi.de','https://werbewerkstatt-bi.de','usr-rb','10020','2023-03-01T00:00:00Z','2024-04-01T00:00:00Z');

-- ══════════════════════════════════════════════
-- CONTACTS (100 Kontakte, ~5 pro Firma)
-- ══════════════════════════════════════════════
INSERT INTO contacts (id,company_id,first_name,last_name,email,phone,mobile,position,department,is_decision_maker,birthday,status,account_manager_id,source,notes,marketing_email,marketing_global_optin,marketing_optin_date,created_at,updated_at) VALUES
-- co-01 Logistik Weser (AutoID)
('ct-001','co-01','Klaus','Weidemann','k.weidemann@logistik-weser.de','+49 5241 884-100','+49 151 11223344','Lagerleiter','Logistik',1,'1971-04-12','active','usr-hbr','erp_import','Hauptansprechpartner für MDE-Rollout',1,1,'2023-03-20T00:00:00Z','2023-03-15T00:00:00Z','2024-03-01T00:00:00Z'),
('ct-002','co-01','Sandra','Koch','s.koch@logistik-weser.de','+49 5241 884-200','+49 172 55667788','IT-Leiterin','IT',1,'1980-09-03','active','usr-hbr','erp_import','Entscheiderin für alle IT-Anschaffungen',1,1,'2023-03-20T00:00:00Z','2023-03-15T00:00:00Z','2024-02-10T00:00:00Z'),
('ct-003','co-01','Bernd','Hoppe','b.hoppe@logistik-weser.de','+49 5241 884-300',NULL,'Geschäftsführer','Management',1,'1965-12-01','active','usr-hbr','erp_import',NULL,0,0,NULL,'2023-03-15T00:00:00Z','2024-01-05T00:00:00Z'),
('ct-004','co-01','Monika','Teske','m.teske@logistik-weser.de','+49 5241 884-400',NULL,'Einkauf','Einkauf',0,NULL,'active','usr-hbr','erp_import',NULL,1,1,'2023-06-01T00:00:00Z','2023-03-15T00:00:00Z','2024-01-05T00:00:00Z'),
('ct-005','co-01','Jan','Bremer','j.bremer@logistik-weser.de','+49 5241 884-500','+49 176 99887766','Schichtleiter','Logistik',0,'1988-07-22','active','usr-hbr','referral',NULL,0,0,NULL,'2023-09-01T00:00:00Z','2024-01-05T00:00:00Z'),
-- co-02 Kanzlei Brandt (eWLAN)
('ct-006','co-02','Dr. Thomas','Brandt','t.brandt@brandt-kanzlei.de','+49 521 9944-10','+49 170 11223300','Rechtsanwalt / Partner','Management',1,'1968-03-15','prospect','usr-hb2','cold_call','Interesse an WLAN-Erneuerung geäußert',1,1,'2024-02-05T00:00:00Z','2024-02-01T00:00:00Z','2024-03-15T00:00:00Z'),
('ct-007','co-02','Petra','Sievers','p.sievers@brandt-kanzlei.de','+49 521 9944-20',NULL,'Kanzleimanagerin','Administration',1,NULL,'prospect','usr-hb2','cold_call','Technische Ansprechpartnerin',0,0,NULL,'2024-02-01T00:00:00Z','2024-02-15T00:00:00Z'),
('ct-008','co-02','Felix','Müller','f.mueller@brandt-kanzlei.de','+49 521 9944-30','+49 151 44556677','IT-Beauftragter','IT',2,'1990-11-08','prospect','usr-hb2','referral',NULL,1,1,'2024-02-10T00:00:00Z','2024-02-01T00:00:00Z','2024-03-10T00:00:00Z'),
('ct-009','co-02','Anna','Klein','a.klein@brandt-kanzlei.de','+49 521 9944-40',NULL,'Rechtsanwältin','Recht',0,NULL,'prospect','usr-hb2','cold_call',NULL,0,0,NULL,'2024-02-01T00:00:00Z','2024-02-20T00:00:00Z'),
('ct-010','co-02','Marco','Schulz','m.schulz@brandt-kanzlei.de','+49 521 9944-50','+49 172 33445566','Assistent','Administration',0,'1995-06-30','prospect','usr-hb2','cold_call',NULL,0,0,NULL,'2024-02-01T00:00:00Z','2024-03-01T00:00:00Z'),
-- co-03 Druckerei Müller (POM)
('ct-011','co-03','Friedrich','Müller','f.mueller@druckerei-mueller.de','+49 5241 7711-10','+49 170 22334455','Inhaber','Management',1,'1960-08-20','active','usr-mm','erp_import','Entscheider, direkt ansprechen',1,1,'2023-06-10T00:00:00Z','2023-06-01T00:00:00Z','2024-04-01T00:00:00Z'),
('ct-012','co-03','Birgit','Müller','b.mueller@druckerei-mueller.de','+49 5241 7711-20',NULL,'Buchhaltung','Finanzen',0,NULL,'active','usr-mm','erp_import',NULL,0,0,NULL,'2023-06-01T00:00:00Z','2024-01-10T00:00:00Z'),
('ct-013','co-03','Holger','Preis','h.preis@druckerei-mueller.de','+49 5241 7711-30','+49 176 55443322','Druckmeister','Produktion',1,'1975-02-14','active','usr-mm','erp_import','Technischer Ansprechpartner MFP-Fleet',1,1,'2023-06-10T00:00:00Z','2023-06-01T00:00:00Z','2024-03-15T00:00:00Z'),
('ct-014','co-03','Sabine','Kraft','s.kraft@druckerei-mueller.de','+49 5241 7711-40',NULL,'Vertriebsinnendienst','Vertrieb',0,'1982-10-05','active','usr-mm','erp_import',NULL,1,1,'2023-06-10T00:00:00Z','2023-06-01T00:00:00Z','2024-02-01T00:00:00Z'),
('ct-015','co-03','Tim','Gross','t.gross@druckerei-mueller.de','+49 5241 7711-50','+49 151 77889900','Auszubildender','Produktion',0,'2004-05-18','active','usr-mm','erp_import',NULL,0,0,NULL,'2023-06-01T00:00:00Z','2023-12-01T00:00:00Z'),
-- co-04 Klinikum OWL (Robotik)
('ct-016','co-04','Dr. Markus','Reinhardt','m.reinhardt@klinikum-owl.de','+49 5231 72-100','+49 170 88776655','Verwaltungsdirektor','Management',1,'1970-01-25','prospect','usr-lk','event','Auf Messe Bielefeld kennengelernt',1,1,'2024-03-05T00:00:00Z','2024-03-01T00:00:00Z','2024-03-30T00:00:00Z'),
('ct-017','co-04','Christine','Weber','c.weber@klinikum-owl.de','+49 5231 72-200',NULL,'Pflegedirektorin','Pflege',1,'1968-07-19','prospect','usr-lk','event','Interessiert an Reinigungsroboter',1,1,'2024-03-05T00:00:00Z','2024-03-01T00:00:00Z','2024-03-28T00:00:00Z'),
('ct-018','co-04','Rainer','Schmidt','r.schmidt@klinikum-owl.de','+49 5231 72-300','+49 176 12345678','Haustechnik','Technik',0,NULL,'prospect','usr-lk','referral',NULL,0,0,NULL,'2024-03-01T00:00:00Z','2024-03-15T00:00:00Z'),
('ct-019','co-04','Ulrike','Baum','u.baum@klinikum-owl.de','+49 5231 72-400',NULL,'Einkauf','Einkauf',2,NULL,'prospect','usr-lk','event',NULL,0,0,NULL,'2024-03-01T00:00:00Z','2024-03-20T00:00:00Z'),
('ct-020','co-04','Stefan','Frank','s.frank@klinikum-owl.de','+49 5231 72-500','+49 151 98765432','IT-Leiter','IT',0,'1979-04-02','prospect','usr-lk','event',NULL,1,1,'2024-03-05T00:00:00Z','2024-03-01T00:00:00Z','2024-03-25T00:00:00Z'),
-- co-05 Stadtwerke Herford (Cloudflare)
('ct-021','co-05','Dirk','Hoffmann','d.hoffmann@stadtwerke-herford.de','+49 5221 188-100','+49 170 66778899','IT-Leiter','IT',1,'1977-09-30','active','usr-aw','referral','Cloudflare-Befürworter, treibt Projekt intern',1,1,'2023-09-15T00:00:00Z','2023-09-10T00:00:00Z','2024-04-01T00:00:00Z'),
('ct-022','co-05','Karin','Lorenz','k.lorenz@stadtwerke-herford.de','+49 5221 188-200',NULL,'Geschäftsführerin','Management',1,'1965-06-14','active','usr-aw','referral','Finale Genehmigung läuft über sie',0,0,NULL,'2023-09-10T00:00:00Z','2024-01-10T00:00:00Z'),
('ct-023','co-05','Olaf','Berg','o.berg@stadtwerke-herford.de','+49 5221 188-300','+49 172 44556699','Sicherheitsbeauftragter','IT',2,'1975-12-08','active','usr-aw','referral','KRITIS-Anforderungen gut bekannt',1,1,'2023-09-15T00:00:00Z','2023-09-10T00:00:00Z','2024-03-20T00:00:00Z'),
('ct-024','co-05','Julia','Werner','j.werner@stadtwerke-herford.de','+49 5221 188-400',NULL,'Projektleiterin','IT',0,NULL,'active','usr-aw','referral',NULL,1,1,'2023-09-15T00:00:00Z','2023-09-10T00:00:00Z','2024-02-15T00:00:00Z'),
('ct-025','co-05','Paul','Heinrich','p.heinrich@stadtwerke-herford.de','+49 5221 188-500','+49 151 22334455','Systemadministrator','IT',0,'1990-03-17','active','usr-aw','referral',NULL,0,0,NULL,'2023-09-10T00:00:00Z','2024-01-05T00:00:00Z'),
-- co-06 Hotel Ravensberger (eWLAN)
('ct-026','co-06','Heinz','Kaufmann','h.kaufmann@ravensberger.de','+49 521 5244-10','+49 170 99887711','Hoteldirektor','Management',1,'1962-11-22','active','usr-hd','erp_import','WLAN komplett neu gemacht 2023',0,0,NULL,'2023-01-15T00:00:00Z','2024-03-28T00:00:00Z'),
('ct-027','co-06','Melanie','Wulf','m.wulf@ravensberger.de','+49 521 5244-20',NULL,'Front Office Managerin','Reception',0,NULL,'active','usr-hd','erp_import',NULL,1,1,'2023-01-20T00:00:00Z','2023-01-15T00:00:00Z','2024-02-10T00:00:00Z'),
('ct-028','co-06','Thomas','Rau','t.rau@ravensberger.de','+49 521 5244-30','+49 176 33445566','Haustechniker','Technik',0,'1978-08-11','active','usr-hd','erp_import',NULL,0,0,NULL,'2023-01-15T00:00:00Z','2024-01-20T00:00:00Z'),
('ct-029','co-06','Lena','Bruns','l.bruns@ravensberger.de','+49 521 5244-40',NULL,'Reservierungen','Administration',0,NULL,'active','usr-hd','erp_import',NULL,1,1,'2023-01-20T00:00:00Z','2023-01-15T00:00:00Z','2024-01-10T00:00:00Z'),
('ct-030','co-06','Kurt','Steinfeld','k.steinfeld@ravensberger.de','+49 521 5244-50','+49 151 77665544','F&B Manager','Gastronomie',0,'1985-02-28','active','usr-hd','erp_import',NULL,0,0,NULL,'2023-01-15T00:00:00Z','2024-01-05T00:00:00Z'),
-- co-07 Lager Westfalia (AutoID)
('ct-031','co-07','Norbert','Hagen','n.hagen@westfalia-gmbh.de','+49 5242 9900-10','+49 170 55443311','Logistikdirektor','Logistik',1,'1969-05-05','active','usr-hbr','erp_import','RFID-Spezialist, sehr technisch versiert',1,1,'2022-05-10T00:00:00Z','2022-05-01T00:00:00Z','2024-03-30T00:00:00Z'),
('ct-032','co-07','Claudia','Jansen','c.jansen@westfalia-gmbh.de','+49 5242 9900-20',NULL,'IT-Koordinatorin','IT',2,NULL,'active','usr-hbr','erp_import',NULL,1,1,'2022-05-10T00:00:00Z','2022-05-01T00:00:00Z','2024-02-15T00:00:00Z'),
('ct-033','co-07','Gregor','Marx','g.marx@westfalia-gmbh.de','+49 5242 9900-30','+49 172 88997766','Schichtführer','Lager',0,'1983-01-16','active','usr-hbr','erp_import',NULL,0,0,NULL,'2022-05-01T00:00:00Z','2024-01-10T00:00:00Z'),
('ct-034','co-07','Ute','Pahde','u.pahde@westfalia-gmbh.de','+49 5242 9900-40',NULL,'Einkauf','Einkauf',0,NULL,'active','usr-hbr','erp_import',NULL,0,0,NULL,'2022-05-01T00:00:00Z','2023-12-01T00:00:00Z'),
('ct-035','co-07','Dennis','Wolf','d.wolf@westfalia-gmbh.de','+49 5242 9900-50','+49 151 66778899','Lagermitarbeiter','Lager',0,'1995-09-12','active','usr-hbr','erp_import',NULL,0,0,NULL,'2022-05-01T00:00:00Z','2023-11-01T00:00:00Z'),
-- co-08 Messe Bielefeld (LFP)
('ct-036','co-08','Frank','Rüter','f.rueter@messe-bielefeld.de','+49 521 9100-10','+49 170 11998877','Marketingleiter','Marketing',1,'1973-03-25','active','usr-cd','erp_import','Großformatdruck für alle Messen',1,1,'2022-05-10T00:00:00Z','2022-05-01T00:00:00Z','2024-03-31T00:00:00Z'),
('ct-037','co-08','Anja','Keller','a.keller@messe-bielefeld.de','+49 521 9100-20',NULL,'Einkäuferin','Einkauf',1,NULL,'active','usr-cd','erp_import','Kontakt für Auftragserteilung',1,1,'2022-05-10T00:00:00Z','2022-05-01T00:00:00Z','2024-02-28T00:00:00Z'),
('ct-038','co-08','Sven','Diekmann','s.diekmann@messe-bielefeld.de','+49 521 9100-30','+49 176 22334455','Messetechniker','Technik',0,'1981-07-07','active','usr-cd','erp_import',NULL,0,0,NULL,'2022-05-01T00:00:00Z','2024-01-15T00:00:00Z'),
('ct-039','co-08','Petra','Voss','p.voss@messe-bielefeld.de','+49 521 9100-40',NULL,'Veranstaltungskoordinatorin','Events',0,NULL,'active','usr-cd','erp_import',NULL,1,1,'2022-05-10T00:00:00Z','2022-05-01T00:00:00Z','2023-12-01T00:00:00Z'),
('ct-040','co-08','Leon','Koch','l.koch@messe-bielefeld.de','+49 521 9100-50','+49 151 33445566','Grafiker','Marketing',0,'1998-01-30','active','usr-cd','erp_import',NULL,1,1,'2022-05-10T00:00:00Z','2022-05-01T00:00:00Z','2023-11-01T00:00:00Z'),
-- co-09 Autohaus Kemper (POM)
('ct-041','co-09','Werner','Kemper','w.kemper@autohaus-kemper.de','+49 5251 8870-10','+49 170 77665544','Inhaber / GF','Management',1,'1958-12-10','active','usr-db2','erp_import',NULL,1,1,'2023-01-15T00:00:00Z','2023-01-10T00:00:00Z','2024-02-20T00:00:00Z'),
('ct-042','co-09','Sabrina','Kemper','s.kemper@autohaus-kemper.de','+49 5251 8870-20',NULL,'Assistentin GF','Management',2,NULL,'active','usr-db2','erp_import',NULL,1,1,'2023-01-15T00:00:00Z','2023-01-10T00:00:00Z','2024-01-10T00:00:00Z'),
('ct-043','co-09','Marc','Vogt','m.vogt@autohaus-kemper.de','+49 5251 8870-30','+49 172 99001122','IT','IT',0,'1987-06-15','active','usr-db2','erp_import',NULL,0,0,NULL,'2023-01-10T00:00:00Z','2023-12-01T00:00:00Z'),
('ct-044','co-09','Gabi','Sauer','g.sauer@autohaus-kemper.de','+49 5251 8870-40',NULL,'Buchhaltung','Finanzen',0,NULL,'active','usr-db2','erp_import',NULL,0,0,NULL,'2023-01-10T00:00:00Z','2023-11-01T00:00:00Z'),
('ct-045','co-09','Patrick','Stein','p.stein@autohaus-kemper.de','+49 5251 8870-50','+49 151 11009988','Serviceleiter','Service',0,'1982-09-03','active','usr-db2','erp_import',NULL,0,0,NULL,'2023-01-10T00:00:00Z','2023-10-01T00:00:00Z'),
-- co-10 Schulzentrum Enger (POM)
('ct-046','co-10','Reinhold','Kramer','r.kramer@sz-enger.de','+49 5224 9710-10',NULL,'Schulleiter','Leitung',1,'1964-04-28','active','usr-mm','erp_import',NULL,0,0,NULL,'2023-04-01T00:00:00Z','2024-01-15T00:00:00Z'),
('ct-047','co-10','Ingrid','Scholz','i.scholz@sz-enger.de','+49 5224 9710-20','+49 176 44556677','Sekretärin','Verwaltung',0,NULL,'active','usr-mm','erp_import',NULL,1,1,'2023-04-05T00:00:00Z','2023-04-01T00:00:00Z','2024-01-10T00:00:00Z'),
('ct-048','co-10','Klaus','Rademacher','k.rademacher@sz-enger.de','+49 5224 9710-30',NULL,'Hausmeister','Technik',0,'1970-08-17','active','usr-mm','erp_import',NULL,0,0,NULL,'2023-04-01T00:00:00Z','2023-12-01T00:00:00Z'),
('ct-049','co-10','Martina','Pohl','m.pohl@sz-enger.de','+49 5224 9710-40',NULL,'Verwaltungsleiterin','Verwaltung',1,NULL,'active','usr-mm','erp_import',NULL,0,0,NULL,'2023-04-01T00:00:00Z','2024-01-05T00:00:00Z'),
('ct-050','co-10','Jörg','Bachmann','j.bachmann@sz-enger.de','+49 5224 9710-50','+49 151 99887700','IT-Koordinator','IT',0,'1980-03-12','active','usr-mm','erp_import',NULL,0,0,NULL,'2023-04-01T00:00:00Z','2023-11-01T00:00:00Z'),
-- co-11 Fleischerei Dörner (Digitaldruckerei)
('ct-051','co-11','Hans','Dörner','h.doerner@doerner-fleisch.de','+49 5222 7800-10','+49 170 33221100','Inhaber','Management',1,'1955-07-04','active','usr-rb','erp_import',NULL,1,1,'2023-07-05T00:00:00Z','2023-07-01T00:00:00Z','2024-02-10T00:00:00Z'),
('ct-052','co-11','Waltraud','Dörner','w.doerner@doerner-fleisch.de','+49 5222 7800-20',NULL,'Buchhaltung','Finanzen',0,NULL,'active','usr-rb','erp_import',NULL,0,0,NULL,'2023-07-01T00:00:00Z','2023-12-01T00:00:00Z'),
('ct-053','co-11','Stefan','Dörner','s.doerner@doerner-fleisch.de','+49 5222 7800-30','+49 172 11223344','Filialleiter','Vertrieb',0,'1984-11-21','active','usr-rb','erp_import',NULL,1,1,'2023-07-05T00:00:00Z','2023-07-01T00:00:00Z','2024-01-15T00:00:00Z'),
('ct-054','co-11','Eva','Mayer','e.mayer@doerner-fleisch.de','+49 5222 7800-40',NULL,'Assistentin','Administration',0,NULL,'active','usr-rb','erp_import',NULL,0,0,NULL,'2023-07-01T00:00:00Z','2023-11-01T00:00:00Z'),
('ct-055','co-11','Max','Schulte','m.schulte@doerner-fleisch.de','+49 5222 7800-50','+49 151 55443322','Marketing','Marketing',0,'1993-02-14','active','usr-rb','erp_import',NULL,1,1,'2023-07-05T00:00:00Z','2023-07-01T00:00:00Z','2023-12-01T00:00:00Z'),
-- co-12 EWG Energieversorgung (Cloudflare)
('ct-056','co-12','Heinrich','Bauer','h.bauer@ewg-minden.de','+49 571 8350-10','+49 170 88990011','CIO','IT',1,'1972-06-18','prospect','usr-aw','cold_call','KRITIS-Anforderungen bekannt, sehr interessiert',1,1,'2024-01-20T00:00:00Z','2024-01-15T00:00:00Z','2024-04-01T00:00:00Z'),
('ct-057','co-12','Elke','Schreiber','e.schreiber@ewg-minden.de','+49 571 8350-20',NULL,'Geschäftsführerin','Management',1,'1966-09-11','prospect','usr-aw','cold_call','Finale Entscheiderin',0,0,NULL,'2024-01-15T00:00:00Z','2024-03-15T00:00:00Z'),
('ct-058','co-12','Carsten','Linde','c.linde@ewg-minden.de','+49 571 8350-30','+49 172 77889900','IT-Admin','IT',0,'1988-04-25','prospect','usr-aw','cold_call',NULL,1,1,'2024-01-20T00:00:00Z','2024-01-15T00:00:00Z','2024-03-01T00:00:00Z'),
('ct-059','co-12','Susanne','Otto','s.otto@ewg-minden.de','+49 571 8350-40',NULL,'Projektkauffrau','Einkauf',0,NULL,'prospect','usr-aw','cold_call',NULL,0,0,NULL,'2024-01-15T00:00:00Z','2024-02-10T00:00:00Z'),
('ct-060','co-12','Torsten','Heise','t.heise@ewg-minden.de','+49 571 8350-50','+49 151 44556600','Netzwerkadmin','IT',0,'1986-12-03','prospect','usr-aw','cold_call',NULL,1,1,'2024-01-20T00:00:00Z','2024-01-15T00:00:00Z','2024-02-28T00:00:00Z'),
-- co-13 Weser Kurier (LFP)
('ct-061','co-13','Gerhard','Bremer','g.bremer@weser-kurier.de','+49 5741 3300-10','+49 170 22113344','Produktionsleiter','Produktion',1,'1967-01-19','active','usr-cd','erp_import',NULL,1,1,'2022-11-10T00:00:00Z','2022-11-01T00:00:00Z','2024-03-20T00:00:00Z'),
('ct-062','co-13','Ilona','Schuster','i.schuster@weser-kurier.de','+49 5741 3300-20',NULL,'Druckvorstufe','Produktion',0,NULL,'active','usr-cd','erp_import',NULL,1,1,'2022-11-10T00:00:00Z','2022-11-01T00:00:00Z','2024-01-15T00:00:00Z'),
('ct-063','co-13','Kai','Sommer','k.sommer@weser-kurier.de','+49 5741 3300-30','+49 172 55667711','Grafiker','Marketing',0,'1990-05-05','active','usr-cd','erp_import',NULL,0,0,NULL,'2022-11-01T00:00:00Z','2024-01-05T00:00:00Z'),
('ct-064','co-13','Helga','Roth','h.roth@weser-kurier.de','+49 5741 3300-40',NULL,'Buchhaltung','Finanzen',0,NULL,'active','usr-cd','erp_import',NULL,0,0,NULL,'2022-11-01T00:00:00Z','2023-12-01T00:00:00Z'),
('ct-065','co-13','Marc','Stein','m.stein@weser-kurier.de','+49 5741 3300-50','+49 151 88997711','IT-Koordinator','IT',0,'1985-08-22','active','usr-cd','erp_import',NULL,0,0,NULL,'2022-11-01T00:00:00Z','2023-11-01T00:00:00Z'),
-- co-14 Reinigungsservice Blitz (Robotik)
('ct-066','co-14','Petra','Blitz','p.blitz@blitz-reinigung.de','+49 521 4440-10','+49 170 44556677','Inhaberin','Management',1,'1971-03-08','active','usr-lk','erp_import','Sehr positives Feedback nach Demo',1,1,'2023-08-20T00:00:00Z','2023-08-15T00:00:00Z','2024-04-02T00:00:00Z'),
('ct-067','co-14','Erika','Hoffmann','e.hoffmann@blitz-reinigung.de','+49 521 4440-20',NULL,'Disponentin','Verwaltung',0,NULL,'active','usr-lk','erp_import',NULL,1,1,'2023-08-20T00:00:00Z','2023-08-15T00:00:00Z','2024-01-10T00:00:00Z'),
('ct-068','co-14','Ahmet','Yilmaz','a.yilmaz@blitz-reinigung.de','+49 521 4440-30','+49 176 99887700','Objektleiter','Betrieb',0,'1980-10-15','active','usr-lk','erp_import',NULL,0,0,NULL,'2023-08-15T00:00:00Z','2024-01-05T00:00:00Z'),
('ct-069','co-14','Lisa','Becker','l.becker@blitz-reinigung.de','+49 521 4440-40',NULL,'Buchhaltung','Finanzen',0,NULL,'active','usr-lk','erp_import',NULL,0,0,NULL,'2023-08-15T00:00:00Z','2023-12-01T00:00:00Z'),
('ct-070','co-14','Murat','Demir','m.demir@blitz-reinigung.de','+49 521 4440-50','+49 151 11223300','Teamleiter','Betrieb',0,'1987-06-20','active','usr-lk','referral',NULL,0,0,NULL,'2023-08-15T00:00:00Z','2023-11-01T00:00:00Z'),
-- co-15 IT-Haus Paderborn (Proxmox)
('ct-071','co-15','Matthias','Krug','m.krug@it-haus-pb.de','+49 5251 6610-10','+49 170 66778800','Geschäftsführer','Management',1,'1976-11-30','prospect','usr-ak2','cold_call','Interessiert an Proxmox-Migration',1,1,'2024-02-15T00:00:00Z','2024-02-10T00:00:00Z','2024-04-01T00:00:00Z'),
('ct-072','co-15','Nicole','Hartmann','n.hartmann@it-haus-pb.de','+49 5251 6610-20',NULL,'Systemadministratorin','IT',1,'1983-04-17','prospect','usr-ak2','cold_call',NULL,1,1,'2024-02-15T00:00:00Z','2024-02-10T00:00:00Z','2024-03-15T00:00:00Z'),
('ct-073','co-15','Boris','Kunz','b.kunz@it-haus-pb.de','+49 5251 6610-30','+49 172 44556688','Netzwerktechniker','IT',0,'1991-07-09','prospect','usr-ak2','cold_call',NULL,0,0,NULL,'2024-02-10T00:00:00Z','2024-03-01T00:00:00Z'),
('ct-074','co-15','Tanja','Simons','t.simons@it-haus-pb.de','+49 5251 6610-40',NULL,'Buchhaltung','Finanzen',0,NULL,'prospect','usr-ak2','cold_call',NULL,0,0,NULL,'2024-02-10T00:00:00Z','2024-02-20T00:00:00Z'),
('ct-075','co-15','Lars','Winkel','l.winkel@it-haus-pb.de','+49 5251 6610-50','+49 151 33221100','Junior Admin','IT',0,'1999-02-22','prospect','usr-ak2','cold_call',NULL,0,0,NULL,'2024-02-10T00:00:00Z','2024-02-15T00:00:00Z'),
-- co-16 Sportpark Brackwede (eWLAN)
('ct-076','co-16','Rolf','Dammer','r.dammer@sportpark-bw.de','+49 521 9200-10','+49 170 11223366','Geschäftsführer','Management',1,'1969-08-14','active','usr-hd','erp_import',NULL,1,1,'2023-05-10T00:00:00Z','2023-05-01T00:00:00Z','2024-02-28T00:00:00Z'),
('ct-077','co-16','Andrea','Siebert','a.siebert@sportpark-bw.de','+49 521 9200-20',NULL,'Rezeption','Administration',0,NULL,'active','usr-hd','erp_import',NULL,1,1,'2023-05-10T00:00:00Z','2023-05-01T00:00:00Z','2024-01-15T00:00:00Z'),
('ct-078','co-16','Tobias','Neumann','t.neumann@sportpark-bw.de','+49 521 9200-30','+49 172 77889966','Technik','Technik',0,'1985-03-30','active','usr-hd','erp_import',NULL,0,0,NULL,'2023-05-01T00:00:00Z','2024-01-05T00:00:00Z'),
('ct-079','co-16','Kathrin','Braun','k.braun@sportpark-bw.de','+49 521 9200-40',NULL,'Kurskoordinatorin','Sport',0,NULL,'active','usr-hd','erp_import',NULL,0,0,NULL,'2023-05-01T00:00:00Z','2023-12-01T00:00:00Z'),
('ct-080','co-16','Alex','Meier','a.meier@sportpark-bw.de','+49 521 9200-50','+49 151 88997766','IT','IT',0,'1993-12-11','active','usr-hd','erp_import',NULL,0,0,NULL,'2023-05-01T00:00:00Z','2023-11-01T00:00:00Z'),
-- co-17 Lippstädter Metall (AutoID)
('ct-081','co-17','Günter','Lehmann','g.lehmann@lippstaedter-metall.de','+49 2941 9080-10','+49 170 55443300','Produktionsleiter','Produktion',1,'1966-02-20','active','usr-hbr','erp_import',NULL,1,1,'2023-02-10T00:00:00Z','2023-02-01T00:00:00Z','2024-03-15T00:00:00Z'),
('ct-082','co-17','Renate','Fischer','r.fischer@lippstaedter-metall.de','+49 2941 9080-20',NULL,'Einkauf','Einkauf',1,NULL,'active','usr-hbr','erp_import',NULL,0,0,NULL,'2023-02-01T00:00:00Z','2024-01-10T00:00:00Z'),
('ct-083','co-17','Dieter','Wolff','d.wolff@lippstaedter-metall.de','+49 2941 9080-30','+49 172 22334477','IT-Leiter','IT',0,'1979-10-28','active','usr-hbr','erp_import',NULL,1,1,'2023-02-10T00:00:00Z','2023-02-01T00:00:00Z','2024-02-15T00:00:00Z'),
('ct-084','co-17','Birgit','Lang','b.lang@lippstaedter-metall.de','+49 2941 9080-40',NULL,'Buchhaltung','Finanzen',0,NULL,'active','usr-hbr','erp_import',NULL,0,0,NULL,'2023-02-01T00:00:00Z','2023-12-01T00:00:00Z'),
('ct-085','co-17','Kevin','Lange','k.lange@lippstaedter-metall.de','+49 2941 9080-50','+49 151 66778800','Lagermitarbeiter','Lager',0,'1997-04-06','active','usr-hbr','erp_import',NULL,0,0,NULL,'2023-02-01T00:00:00Z','2023-11-01T00:00:00Z'),
-- co-18 Kreishandwerkerschaft (POM)
('ct-086','co-18','Horst','Beckmann','h.beckmann@khs-owl.de','+49 5231 9620-10','+49 170 33445500','Hauptgeschäftsführer','Management',1,'1961-06-17','prospect','usr-db2','event','Auf Handwerksmesse Bielefeld getroffen',1,1,'2024-01-25T00:00:00Z','2024-01-20T00:00:00Z','2024-03-28T00:00:00Z'),
('ct-087','co-18','Christa','Voss','c.voss@khs-owl.de','+49 5231 9620-20',NULL,'Sekretariat','Verwaltung',0,NULL,'prospect','usr-db2','event',NULL,1,1,'2024-01-25T00:00:00Z','2024-01-20T00:00:00Z','2024-02-20T00:00:00Z'),
('ct-088','co-18','Wolfgang','Krohn','w.krohn@khs-owl.de','+49 5231 9620-30','+49 172 11223366','IT-Koordinator','IT',0,'1975-09-14','prospect','usr-db2','event',NULL,0,0,NULL,'2024-01-20T00:00:00Z','2024-02-10T00:00:00Z'),
('ct-089','co-18','Hannelore','Stein','h.stein@khs-owl.de','+49 5231 9620-40',NULL,'Buchhaltung','Finanzen',0,NULL,'prospect','usr-db2','event',NULL,0,0,NULL,'2024-01-20T00:00:00Z','2024-02-01T00:00:00Z'),
('ct-090','co-18','Michael','Brand','m.brand@khs-owl.de','+49 5231 9620-50','+49 151 55443388','Lehrlingswart','Verwaltung',0,'1980-01-08','prospect','usr-db2','event',NULL,0,0,NULL,'2024-01-20T00:00:00Z','2024-01-28T00:00:00Z'),
-- co-19 Fachklinik Senne (Proxmox)
('ct-091','co-19','Dr. Peter','Böhm','p.boehm@fachklinik-senne.de','+49 521 4480-10','+49 170 99001166','Ärztlicher Direktor','Leitung',1,'1963-12-02','active','usr-ak2','referral',NULL,0,0,NULL,'2023-06-15T00:00:00Z','2024-03-10T00:00:00Z'),
('ct-092','co-19','Ingeborg','Damm','i.damm@fachklinik-senne.de','+49 521 4480-20',NULL,'IT-Leiterin','IT',1,'1974-08-19','active','usr-ak2','referral','Hat Proxmox bereits in Pilotbetrieb',1,1,'2023-06-20T00:00:00Z','2023-06-15T00:00:00Z','2024-03-10T00:00:00Z'),
('ct-093','co-19','Frank','Bode','f.bode@fachklinik-senne.de','+49 521 4480-30','+49 172 66778811','Systemadministrator','IT',0,'1985-05-12','active','usr-ak2','referral',NULL,1,1,'2023-06-20T00:00:00Z','2023-06-15T00:00:00Z','2024-02-15T00:00:00Z'),
('ct-094','co-19','Beate','Kröger','b.kroeger@fachklinik-senne.de','+49 521 4480-40',NULL,'Verwaltungsleitung','Verwaltung',0,NULL,'active','usr-ak2','referral',NULL,0,0,NULL,'2023-06-15T00:00:00Z','2024-01-10T00:00:00Z'),
('ct-095','co-19','Jonas','Schubert','j.schubert@fachklinik-senne.de','+49 521 4480-50','+49 151 44556611','IT-Mitarbeiter','IT',0,'1996-11-15','active','usr-ak2','referral',NULL,0,0,NULL,'2023-06-15T00:00:00Z','2023-12-01T00:00:00Z'),
-- co-20 Werbewerkstatt (Digitaldruckerei)
('ct-096','co-20','Nadine','Kruse','n.kruse@werbewerkstatt-bi.de','+49 521 5500-10','+49 170 22334411','Inhaberin','Management',1,'1978-07-25','active','usr-rb','erp_import',NULL,1,1,'2023-03-10T00:00:00Z','2023-03-01T00:00:00Z','2024-04-01T00:00:00Z'),
('ct-097','co-20','Simon','Bauer','s.bauer@werbewerkstatt-bi.de','+49 521 5500-20',NULL,'Grafiker','Produktion',0,NULL,'active','usr-rb','erp_import',NULL,1,1,'2023-03-10T00:00:00Z','2023-03-01T00:00:00Z','2024-02-15T00:00:00Z'),
('ct-098','co-20','Clara','Fischer','c.fischer@werbewerkstatt-bi.de','+49 521 5500-30','+49 172 33445511','Kundenberaterin','Vertrieb',0,'1989-09-08','active','usr-rb','erp_import',NULL,1,1,'2023-03-10T00:00:00Z','2023-03-01T00:00:00Z','2024-01-20T00:00:00Z'),
('ct-099','co-20','Jonas','Wild','j.wild@werbewerkstatt-bi.de','+49 521 5500-40',NULL,'Druckoperator','Produktion',0,NULL,'active','usr-rb','erp_import',NULL,0,0,NULL,'2023-03-01T00:00:00Z','2023-12-01T00:00:00Z'),
('ct-100','co-20','Stefanie','Horn','s.horn@werbewerkstatt-bi.de','+49 521 5500-50','+49 151 77889911','Buchhaltung','Finanzen',0,'1982-04-16','active','usr-rb','erp_import',NULL,0,0,NULL,'2023-03-01T00:00:00Z','2023-11-01T00:00:00Z');

-- ══════════════════════════════════════════════
-- DEALS (40 Deals)
-- ══════════════════════════════════════════════
INSERT INTO deals (id,title,company_id,contact_id,owner_id,bereich,stage,value,probability,expected_close,status,notes,created_at,updated_at) VALUES
-- AutoID
('dl-01','MDE-Fleet Rollout 120 Geräte',       'co-01','ct-002','usr-hbr','ITS','proposal',  48000,70,'2024-05-15','open','Zebra TC78 + Cradles + Support',          '2024-01-15T00:00:00Z','2024-03-20T00:00:00Z'),
('dl-02','RFID Paletten-Tracking System',       'co-07','ct-031','usr-hbr','ITS','negotiation',85000,85,'2024-04-30','open','600 RFID-Tags + 4 Fixed Reader',           '2023-11-01T00:00:00Z','2024-04-01T00:00:00Z'),
('dl-03','Barcode-Scanner Erneuerung 50 Stk',  'co-17','ct-081','usr-hbr','ITS','won',        18500,100,'2024-02-28','won',NULL,                                       '2023-12-01T00:00:00Z','2024-03-01T00:00:00Z'),
('dl-04','MDE Außendienst-Lösung 20 Geräte',   'co-07','ct-032','usr-hbr','ITS','lead',        9200,20,'2024-07-01','open','Pilot läuft, Ergebnis abwarten',           '2024-03-15T00:00:00Z','2024-04-01T00:00:00Z'),
('dl-05','RFID Asset-Tracking Produktion',      'co-17','ct-083','usr-hbr','ITS','qualified',  32000,50,'2024-06-30','open',NULL,                                       '2024-02-01T00:00:00Z','2024-03-28T00:00:00Z'),
-- POM
('dl-06','MPS-Vertrag 45 MFP-Geräte',          'co-03','ct-011','usr-mm', 'POM','won',           67200,100,'2024-01-01','won','Konica Minolta, 36 Monate',               '2023-08-01T00:00:00Z','2024-01-15T00:00:00Z'),
('dl-07','Druckerflotte 8 Geräte Neukauf',     'co-09','ct-041','usr-db2','POM','proposal',      24000,60,'2024-05-30','open','Kyocera ECOSYS MA4500ifx',                 '2024-02-01T00:00:00Z','2024-03-25T00:00:00Z'),
('dl-08','Multifunktionssystem Schulnetz',      'co-10','ct-046','usr-mm', 'POM','negotiation',  18700,80,'2024-04-15','open','5 Geräte + PaperCut NG',                  '2024-01-10T00:00:00Z','2024-03-30T00:00:00Z'),
('dl-09','Print-Audit & Optimierung',           'co-18','ct-086','usr-db2','POM','lead',           4500,25,'2024-06-01','open','Erstgespräch positiv',                    '2024-02-15T00:00:00Z','2024-03-28T00:00:00Z'),
('dl-10','MPS Erweiterung 15 weitere Geräte',  'co-03','ct-013','usr-mm', 'POM','qualified',    22500,55,'2024-06-15','open',NULL,                                        '2024-03-01T00:00:00Z','2024-04-01T00:00:00Z'),
-- Cloudflare / IT Security
('dl-11','CF Zero Trust ZTNA Essentials 80U',  'co-05','ct-021','usr-aw', 'Cloudflare','won',   19200,100,'2024-03-01','won','48 Monate, MSSP-Modell',                  '2023-07-01T00:00:00Z','2024-03-01T00:00:00Z'),
('dl-12','CF ZTNA Advanced 150 User',           'co-12','ct-056','usr-aw', 'Cloudflare','proposal',54000,65,'2024-06-01','open','KRITIS-Anforderung, sehr komplex',        '2024-01-20T00:00:00Z','2024-04-01T00:00:00Z'),
('dl-13','CF Gateway + Email Security',         'co-05','ct-023','usr-hb2','Cloudflare','won',    8400,100,'2024-02-01','won','Add-on zu bestehendem Vertrag',            '2024-01-05T00:00:00Z','2024-02-10T00:00:00Z'),
('dl-14','Zero Trust Assessment Workshop',      'co-12','ct-057','usr-aw', 'Cloudflare','negotiation',4500,80,'2024-04-30','open',NULL,                                   '2024-03-01T00:00:00Z','2024-04-01T00:00:00Z'),
('dl-15','CF R2 + Pages Webinfra Stadtwerke',   'co-05','ct-024','usr-hd', 'Cloudflare','qualified',3600,45,'2024-07-01','open',NULL,                                     '2024-03-15T00:00:00Z','2024-04-01T00:00:00Z'),
-- Proxmox
('dl-16','Proxmox VE Cluster 3 Nodes',         'co-19','ct-092','usr-ak2','Proxmox','won',       28500,100,'2024-01-15','won','Migration von VMware',                     '2023-09-01T00:00:00Z','2024-01-20T00:00:00Z'),
('dl-17','Proxmox Backup Server Setup',        'co-15','ct-071','usr-ak2','Proxmox','proposal',  12800,60,'2024-05-15','open','PBS + Ceph Storage',                       '2024-02-10T00:00:00Z','2024-04-01T00:00:00Z'),
('dl-18','Proxmox Migration 8 VMs',            'co-19','ct-093','usr-ak2','Proxmox','won',        8900,100,'2024-02-28','won',NULL,                                        '2024-01-10T00:00:00Z','2024-03-01T00:00:00Z'),
('dl-19','Proxmox Schulung + Support',         'co-15','ct-072','usr-ak2','Proxmox','negotiation',4200,75,'2024-04-30','open',NULL,                                       '2024-03-01T00:00:00Z','2024-04-01T00:00:00Z'),
-- eWLAN
('dl-20','UniFi Campus WLAN 80 AP',            'co-06','ct-026','usr-hd', 'eWLAN','won',         42000,100,'2023-06-01','won','3 Jahre Wartungsvertrag inklusive',        '2023-02-01T00:00:00Z','2023-06-15T00:00:00Z'),
('dl-21','Netzwerk-Modernisierung Kanzlei',    'co-02','ct-006','usr-hb2','eWLAN','negotiation', 18500,75,'2024-04-30','open','UniFi Dream Machine Pro + 12 AP',          '2024-02-15T00:00:00Z','2024-03-30T00:00:00Z'),
('dl-22','WLAN Sportpark 25 AP Erweiterung',   'co-16','ct-076','usr-hd', 'eWLAN','qualified',  11200,50,'2024-05-30','open',NULL,                                        '2024-02-20T00:00:00Z','2024-03-25T00:00:00Z'),
('dl-23','SD-WAN Stadtwerke Herford',          'co-05','ct-021','usr-aw', 'eWLAN','lead',         7800,20,'2024-08-01','open','Noch in Abstimmung',                        '2024-03-20T00:00:00Z','2024-04-01T00:00:00Z'),
('dl-24','Ruckus Enterprise WLAN Hotel',       'co-06','ct-028','usr-hd', 'eWLAN','proposal',   14500,55,'2024-06-15','open','Erweiterung Außenbereich',                  '2024-03-10T00:00:00Z','2024-04-01T00:00:00Z'),
-- LFP
('dl-25','Roland UV-Drucker RF640',            'co-08','ct-036','usr-cd', 'LFP','won',           72000,100,'2023-09-01','won','Inkl. Installation + Schulung',            '2023-04-01T00:00:00Z','2023-09-15T00:00:00Z'),
('dl-26','HP Latex 800W Großformat',           'co-13','ct-061','usr-cd', 'LFP','proposal',      45000,65,'2024-05-30','open','Ersatz für Altgerät',                       '2024-01-15T00:00:00Z','2024-03-20T00:00:00Z'),
('dl-27','Mimaki JFX200-2513 UV Flatbed',      'co-08','ct-037','usr-cd', 'LFP','negotiation',  112000,80,'2024-06-30','open','Größte Anschaffung 2024',                   '2024-02-01T00:00:00Z','2024-04-01T00:00:00Z'),
('dl-28','Schneideplotter + Zubehör',          'co-13','ct-062','usr-cd', 'LFP','qualified',      8400,45,'2024-07-01','open',NULL,                                        '2024-03-01T00:00:00Z','2024-03-28T00:00:00Z'),
-- Robotik
('dl-29','Cleanfix RA660 Scheuersaugmaschine', 'co-14','ct-066','usr-lk', 'Robotik','won',       18900,100,'2024-01-01','won','Inkl. Wartungsvertrag 3 Jahre',            '2023-09-01T00:00:00Z','2024-01-10T00:00:00Z'),
('dl-30','2x Avidbots N20 Reinigungsroboter',  'co-04','ct-016','usr-lk', 'Robotik','proposal',  58000,60,'2024-07-01','open','Demo Ende April geplant',                  '2024-03-01T00:00:00Z','2024-04-01T00:00:00Z'),
('dl-31','Roboter Wartungsvertrag 2 Jahre',    'co-14','ct-066','usr-kf', 'POM','won',        9600,100,'2024-02-01','won',NULL,                                        '2024-01-10T00:00:00Z','2024-02-15T00:00:00Z'),
('dl-32','Nilfisk Liberty SC50 Pilotprojekt',  'co-04','ct-017','usr-kf', 'POM','qualified', 22000,40,'2024-08-01','open','Pilot 1 Gerät, Option auf 5 weitere',      '2024-03-15T00:00:00Z','2024-04-01T00:00:00Z'),
-- Digitaldruckerei
('dl-33','Jahresauftrag Flyer/Broschüren',     'co-11','ct-051','usr-rb', 'Digitaldruckerei','won',14400,100,'2024-01-01','won','12 Monate Rahmenvertrag',                '2023-11-01T00:00:00Z','2024-01-15T00:00:00Z'),
('dl-34','Großauftrag Messematerialien 2024',  'co-08','ct-036','usr-rb', 'Digitaldruckerei','proposal',22000,70,'2024-04-15','open','Diverse Formate, 4c + Sonderfarben',  '2024-02-15T00:00:00Z','2024-03-28T00:00:00Z'),
('dl-35','Werbemittel-Produktion Q2/Q3',       'co-20','ct-096','usr-rb', 'Digitaldruckerei','negotiation',18500,78,'2024-05-15','open',NULL,                             '2024-02-20T00:00:00Z','2024-04-01T00:00:00Z'),
('dl-36','Verpackungsdruck Fleischerei',       'co-11','ct-051','usr-rb', 'Digitaldruckerei','qualified',8200,50,'2024-06-01','open',NULL,                                  '2024-03-01T00:00:00Z','2024-04-01T00:00:00Z'),
-- Mixed / KAM
('dl-37','IT-Komplett-Paket Schulzentrum',     'co-10','ct-049','usr-ce', 'POM','negotiation',   31000,72,'2024-05-01','open','POM + eWLAN + Support kombiniert',          '2024-01-15T00:00:00Z','2024-03-30T00:00:00Z'),
('dl-38','Cloudflare + Proxmox Bundle Klinik', 'co-19','ct-091','usr-ak2','Proxmox','won',        16500,100,'2024-03-01','won','CF Access + Proxmox Cluster',              '2024-01-20T00:00:00Z','2024-03-05T00:00:00Z'),
('dl-39','WLAN + MDE Logistik Kombi',          'co-01','ct-001','usr-hbr','ITS','proposal',    28000,62,'2024-05-30','open','AutoID + eWLAN kombiniert',                '2024-02-10T00:00:00Z','2024-03-25T00:00:00Z'),
('dl-40','Druckerei Full-Service Verlängerung','co-03','ct-011','usr-mm', 'POM','negotiation',    78000,88,'2024-07-01','open','Verlängerung + Upgrade 12 Geräte',          '2024-03-01T00:00:00Z','2024-04-01T00:00:00Z');

-- ══════════════════════════════════════════════
-- ACTIVITIES (80 Aktivitäten)
-- ══════════════════════════════════════════════
INSERT INTO activities (id,type,subject,body,company_id,contact_id,deal_id,owner_id,status,due_at,done_at,created_at,updated_at) VALUES
('ak-001','call','Erstgespräch MDE-Fleet','Interesse bestätigt, Demo vereinbart','co-01','ct-002','dl-01','usr-hbr','done','2024-01-20T10:00:00Z','2024-01-20T10:45:00Z','2024-01-18T00:00:00Z','2024-01-20T11:00:00Z'),
('ak-002','meeting','Demo Zebra TC78 vor Ort','Vorführung 4 Geräte, sehr positives Feedback','co-01','ct-001','dl-01','usr-hbr','done','2024-02-08T09:00:00Z','2024-02-08T12:00:00Z','2024-02-01T00:00:00Z','2024-02-08T13:00:00Z'),
('ak-003','email','Angebot MDE-Fleet 120 Geräte versendet',NULL,'co-01','ct-002','dl-01','usr-hbr','done','2024-02-15T00:00:00Z','2024-02-15T09:30:00Z','2024-02-14T00:00:00Z','2024-02-15T10:00:00Z'),
('ak-004','call','Nachfassen Angebot MDE','Rückfragen zu Garantie und SLA','co-01','ct-002','dl-01','usr-hbr','open','2024-04-10T10:00:00Z',NULL,'2024-03-20T00:00:00Z','2024-03-20T00:00:00Z'),
('ak-005','meeting','Verhandlung RFID Westfalia','Preis und Lieferzeit besprochen','co-07','ct-031','dl-02','usr-hbr','done','2024-03-15T14:00:00Z','2024-03-15T16:00:00Z','2024-03-10T00:00:00Z','2024-03-15T17:00:00Z'),
('ak-006','email','Vertragsunterlagen RFID','Vertragsentwurf versendet','co-07','ct-031','dl-02','usr-hbr','done','2024-03-22T00:00:00Z','2024-03-22T08:00:00Z','2024-03-20T00:00:00Z','2024-03-22T09:00:00Z'),
('ak-007','call','Abschluss Barcode-Scanner','Auftrag erteilt, Liefertermin KW12','co-17','ct-081','dl-03','usr-hbr','done','2024-02-20T11:00:00Z','2024-02-20T11:30:00Z','2024-02-18T00:00:00Z','2024-02-20T12:00:00Z'),
('ak-008','meeting','Kanzlei Brandt WLAN-Begehung','Raumplan aufgenommen, 12 AP-Standorte','co-02','ct-006','dl-21','usr-hb2','done','2024-02-20T10:00:00Z','2024-02-20T12:00:00Z','2024-02-15T00:00:00Z','2024-02-20T13:00:00Z'),
('ak-009','email','Angebot UniFi Kanzlei','Detailkalkulation versendet','co-02','ct-006','dl-21','usr-hb2','done','2024-03-01T00:00:00Z','2024-03-01T09:00:00Z','2024-02-28T00:00:00Z','2024-03-01T10:00:00Z'),
('ak-010','call','Nachfassen Kanzlei Brandt','Preisdiskussion, noch 2 Wochen Zeit','co-02','ct-007','dl-21','usr-hb2','done','2024-03-20T14:00:00Z','2024-03-20T14:30:00Z','2024-03-18T00:00:00Z','2024-03-20T15:00:00Z'),
('ak-011','call','MPS-Abschluss Druckerei Müller','Vertrag unterschrieben, Jubel!','co-03','ct-011','dl-06','usr-mm','done','2024-01-10T10:00:00Z','2024-01-10T10:20:00Z','2024-01-09T00:00:00Z','2024-01-10T11:00:00Z'),
('ak-012','meeting','Geräteinventur Druckerei','Alle 45 Geräte aufgenommen','co-03','ct-013','dl-06','usr-mm','done','2024-01-20T08:00:00Z','2024-01-20T13:00:00Z','2024-01-18T00:00:00Z','2024-01-20T14:00:00Z'),
('ak-013','task','Vertragsverlängerung vorbereiten Druckerei','Vertrag läuft 2025 aus, jetzt schon ansprechen','co-03','ct-011','dl-40','usr-mm','open','2024-04-15T09:00:00Z',NULL,'2024-03-01T00:00:00Z','2024-03-01T00:00:00Z'),
('ak-014','meeting','Klinikum OWL Roboter-Demo','Cleanfix Demo, 2 Klinikleitungen dabei','co-04','ct-016','dl-30','usr-lk','open','2024-04-25T10:00:00Z',NULL,'2024-03-20T00:00:00Z','2024-03-20T00:00:00Z'),
('ak-015','call','Vorgespräch Klinikum OWL','Anforderungen geklärt, Demo terminiert','co-04','ct-017','dl-30','usr-lk','done','2024-03-10T14:00:00Z','2024-03-10T14:45:00Z','2024-03-08T00:00:00Z','2024-03-10T15:00:00Z'),
('ak-016','email','ZTNA-Konzept Stadtwerke','Detailliertes Konzept CF Zero Trust versendet','co-05','ct-021','dl-11','usr-aw','done','2023-10-15T00:00:00Z','2023-10-15T10:00:00Z','2023-10-14T00:00:00Z','2023-10-15T11:00:00Z'),
('ak-017','meeting','ZTNA Workshop Stadtwerke','4-stündiger Technik-Workshop, 6 Teilnehmer','co-05','ct-021','dl-11','usr-aw','done','2023-11-08T09:00:00Z','2023-11-08T13:00:00Z','2023-11-01T00:00:00Z','2023-11-08T14:00:00Z'),
('ak-018','call','Vertragsabschluss Stadtwerke CF','Bestellung eingegangen, Freude!','co-05','ct-021','dl-11','usr-aw','done','2024-03-05T11:00:00Z','2024-03-05T11:15:00Z','2024-03-04T00:00:00Z','2024-03-05T12:00:00Z'),
('ak-019','call','EWG Minden Erstgespräch','KRITIS-Anforderungen besprochen','co-12','ct-056','dl-12','usr-aw','done','2024-01-25T10:00:00Z','2024-01-25T11:00:00Z','2024-01-23T00:00:00Z','2024-01-25T12:00:00Z'),
('ak-020','meeting','EWG Minden Vor-Ort-Termin','Netzwerk-Ist-Analyse, 3 Stunden','co-12','ct-056','dl-12','usr-aw','done','2024-02-14T09:00:00Z','2024-02-14T12:00:00Z','2024-02-08T00:00:00Z','2024-02-14T13:00:00Z'),
('ak-021','email','CF ZTNA Angebot EWG','Angebot 150 User + Gateway','co-12','ct-056','dl-12','usr-aw','done','2024-03-01T00:00:00Z','2024-03-01T10:00:00Z','2024-02-28T00:00:00Z','2024-03-01T11:00:00Z'),
('ak-022','call','Preisverhandlung EWG','Rabatt 8% gewährt, Entscheidung nächste Woche','co-12','ct-057','dl-12','usr-aw','done','2024-03-22T14:00:00Z','2024-03-22T14:45:00Z','2024-03-20T00:00:00Z','2024-03-22T15:00:00Z'),
('ak-023','task','Follow-up EWG Minden','Entscheidung anfordern','co-12','ct-056','dl-12','usr-aw','open','2024-04-05T10:00:00Z',NULL,'2024-03-25T00:00:00Z','2024-03-25T00:00:00Z'),
('ak-024','meeting','Hotel Ravensberger WLAN-Abnahme','Alle 80 AP in Betrieb, Kundenzufrieden','co-06','ct-026','dl-20','usr-hd','done','2023-06-20T10:00:00Z','2023-06-20T12:00:00Z','2023-06-18T00:00:00Z','2023-06-20T13:00:00Z'),
('ak-025','call','Quarterly Review Hotel','Alles läuft, WLAN-Auslastung Top','co-06','ct-026',NULL,'usr-hd','done','2024-01-15T11:00:00Z','2024-01-15T11:30:00Z','2024-01-13T00:00:00Z','2024-01-15T12:00:00Z'),
('ak-026','meeting','Begehung Ruckus Erweiterung Hotel','Außenbereich 3 neue AP-Standorte','co-06','ct-028','dl-24','usr-hd','done','2024-03-12T10:00:00Z','2024-03-12T12:00:00Z','2024-03-08T00:00:00Z','2024-03-12T13:00:00Z'),
('ak-027','call','Proxmox Abnahme Fachklinik','Migration erfolgreich, 8 VMs laufen','co-19','ct-092','dl-16','usr-ak2','done','2024-01-18T14:00:00Z','2024-01-18T14:30:00Z','2024-01-17T00:00:00Z','2024-01-18T15:00:00Z'),
('ak-028','meeting','Proxmox Workshop IT-Haus PB','Schulung 3 Admins, 6 Stunden','co-15','ct-072','dl-17','usr-ak2','open','2024-04-18T09:00:00Z',NULL,'2024-03-25T00:00:00Z','2024-03-25T00:00:00Z'),
('ak-029','email','PBS Angebot IT-Haus','Proxmox Backup Server Angebot','co-15','ct-071','dl-17','usr-ak2','done','2024-03-05T00:00:00Z','2024-03-05T09:00:00Z','2024-03-04T00:00:00Z','2024-03-05T10:00:00Z'),
('ak-030','call','Roland UV Druckabnahme Messe','Gerät läuft perfekt, Kunde sehr zufrieden','co-08','ct-036','dl-25','usr-cd','done','2023-09-10T11:00:00Z','2023-09-10T11:30:00Z','2023-09-09T00:00:00Z','2023-09-10T12:00:00Z'),
('ak-031','meeting','HP Latex Demo Weser Kurier','Druckqualität-Test vor Ort, beeindruckt','co-13','ct-061','dl-26','usr-cd','done','2024-02-22T10:00:00Z','2024-02-22T13:00:00Z','2024-02-18T00:00:00Z','2024-02-22T14:00:00Z'),
('ak-032','email','Angebot HP Latex 800W','Detailangebot mit Finanzierungsoptionen','co-13','ct-061','dl-26','usr-cd','done','2024-03-05T00:00:00Z','2024-03-05T09:30:00Z','2024-03-04T00:00:00Z','2024-03-05T10:00:00Z'),
('ak-033','call','Mimaki Preisverhandlung Messe','Großauftrag, 8% Rabatt durchgesetzt','co-08','ct-037','dl-27','usr-cd','done','2024-03-28T14:00:00Z','2024-03-28T15:00:00Z','2024-03-25T00:00:00Z','2024-03-28T15:30:00Z'),
('ak-034','meeting','Roboter-Abnahme Blitz Reinigung','Cleanfix RA660 in Betrieb genommen','co-14','ct-066','dl-29','usr-lk','done','2024-01-08T09:00:00Z','2024-01-08T11:00:00Z','2024-01-05T00:00:00Z','2024-01-08T12:00:00Z'),
('ak-035','call','Roboter Ergebnis Blitz','Top Ergebnisse, 30% Zeitersparnis','co-14','ct-066',NULL,'usr-lk','done','2024-02-15T10:00:00Z','2024-02-15T10:30:00Z','2024-02-13T00:00:00Z','2024-02-15T11:00:00Z'),
('ak-036','email','Nilfisk Pilotangebot Klinikum','Angebot 1 Gerät Pilot + Option 5','co-04','ct-016','dl-32','usr-kf','done','2024-03-20T00:00:00Z','2024-03-20T09:00:00Z','2024-03-18T00:00:00Z','2024-03-20T10:00:00Z'),
('ak-037','call','Autohaus Kemper Druckerbedarf','8 Geräte definiert, Angebot folgt','co-09','ct-041','dl-07','usr-db2','done','2024-02-08T11:00:00Z','2024-02-08T11:45:00Z','2024-02-06T00:00:00Z','2024-02-08T12:00:00Z'),
('ak-038','email','Kyocera Angebot Autohaus','Angebot 8 MFP + Wartung 5 Jahre','co-09','ct-041','dl-07','usr-db2','done','2024-02-20T00:00:00Z','2024-02-20T09:00:00Z','2024-02-18T00:00:00Z','2024-02-20T10:00:00Z'),
('ak-039','call','Nachfassen Autohaus Kemper','Genehmigung läuft noch, Mitte Mai','co-09','ct-041','dl-07','usr-db2','open','2024-04-08T11:00:00Z',NULL,'2024-03-20T00:00:00Z','2024-03-20T00:00:00Z'),
('ak-040','meeting','Schulzentrum Enger MFP-Begehung','5 Geräte-Standorte aufgenommen','co-10','ct-046','dl-08','usr-mm','done','2024-01-18T09:00:00Z','2024-01-18T11:00:00Z','2024-01-15T00:00:00Z','2024-01-18T12:00:00Z'),
('ak-041','email','Angebot Schulzentrum + PaperCut','5 MFP + PaperCut NG Vollpaket','co-10','ct-049','dl-08','usr-mm','done','2024-02-01T00:00:00Z','2024-02-01T09:00:00Z','2024-01-30T00:00:00Z','2024-02-01T10:00:00Z'),
('ak-042','note','Jahresgespräch Messe Bielefeld','LFP-Druck läuft super, Erweiterung gewünscht','co-08','ct-036',NULL,'usr-cd','done','2024-01-25T11:00:00Z','2024-01-25T11:30:00Z','2024-01-23T00:00:00Z','2024-01-25T12:00:00Z'),
('ak-043','call','Fleischerei Jahresvertrag erneuern','Automatisch verlängert, Druck weiter','co-11','ct-051','dl-33','usr-rb','done','2024-01-08T10:00:00Z','2024-01-08T10:20:00Z','2024-01-06T00:00:00Z','2024-01-08T11:00:00Z'),
('ak-044','meeting','Messematerialien Besprechung','Formate und Mengen für 2024 definiert','co-08','ct-036','dl-34','usr-rb','done','2024-02-20T14:00:00Z','2024-02-20T15:30:00Z','2024-02-18T00:00:00Z','2024-02-20T16:00:00Z'),
('ak-045','email','Angebot Messematerialien','22.000 € Angebot inkl. Lieferung','co-08','ct-037','dl-34','usr-rb','done','2024-03-01T00:00:00Z','2024-03-01T09:30:00Z','2024-02-28T00:00:00Z','2024-03-01T10:00:00Z'),
('ak-046','call','Werbewerkstatt Jahresplanung','Werbemittel Q2/Q3 besprochen','co-20','ct-096','dl-35','usr-rb','done','2024-02-25T10:00:00Z','2024-02-25T10:45:00Z','2024-02-23T00:00:00Z','2024-02-25T11:00:00Z'),
('ak-047','meeting','KHS OWL Ersttermin','Druckbedarf aufgenommen, Audit angeboten','co-18','ct-086','dl-09','usr-db2','done','2024-02-05T10:00:00Z','2024-02-05T11:30:00Z','2024-02-01T00:00:00Z','2024-02-05T12:00:00Z'),
('ak-048','call','Stadtwerke Gateway Email','Zusatzbestellung Email Security','co-05','ct-023','dl-13','usr-hb2','done','2024-01-08T14:00:00Z','2024-01-08T14:20:00Z','2024-01-07T00:00:00Z','2024-01-08T15:00:00Z'),
('ak-049','meeting','Sportpark WLAN Planung','Erweiterung 25 AP geplant','co-16','ct-076','dl-22','usr-hd','done','2024-02-28T10:00:00Z','2024-02-28T12:00:00Z','2024-02-25T00:00:00Z','2024-02-28T13:00:00Z'),
('ak-050','email','UniFi Erweiterungsangebot Sportpark','25 AP + Switches Angebot','co-16','ct-076','dl-22','usr-hd','done','2024-03-08T00:00:00Z','2024-03-08T09:00:00Z','2024-03-07T00:00:00Z','2024-03-08T10:00:00Z'),
('ak-051','call','Schneideplotter Anfrage WK','Technische Specs angefragt','co-13','ct-062','dl-28','usr-cd','done','2024-03-10T10:00:00Z','2024-03-10T10:30:00Z','2024-03-08T00:00:00Z','2024-03-10T11:00:00Z'),
('ak-052','task','Westfalia RFID Tracking Inbetriebnahme','Installation in KW 18 planen','co-07','ct-031','dl-02','usr-hbr','open','2024-04-22T08:00:00Z',NULL,'2024-04-01T00:00:00Z','2024-04-01T00:00:00Z'),
('ak-053','call','CF Assessment Workshop EWG','Termin für Assessment vereinbart','co-12','ct-056','dl-14','usr-aw','done','2024-03-15T11:00:00Z','2024-03-15T11:30:00Z','2024-03-13T00:00:00Z','2024-03-15T12:00:00Z'),
('ak-054','email','SD-WAN Konzept Stadtwerke','Whitepaper CF SD-WAN für Stadtwerke versendet','co-05','ct-024','dl-23','usr-aw','done','2024-03-25T00:00:00Z','2024-03-25T09:00:00Z','2024-03-22T00:00:00Z','2024-03-25T10:00:00Z'),
('ak-055','call','Lippstädter Metall RFID','Asset-Tracking Anforderungen besprochen','co-17','ct-083','dl-05','usr-hbr','done','2024-02-08T10:00:00Z','2024-02-08T10:45:00Z','2024-02-06T00:00:00Z','2024-02-08T11:00:00Z'),
('ak-056','meeting','Proxmox Schulung IT-Haus Follow-up','Nachschulung nach Erstinstallation','co-15','ct-072','dl-19','usr-ak2','done','2024-03-20T09:00:00Z','2024-03-20T13:00:00Z','2024-03-15T00:00:00Z','2024-03-20T14:00:00Z'),
('ak-057','note','Westfalia RFID Status','Pilotphase erfolgreich, Vollrollout in Planung','co-07','ct-031','dl-04','usr-hbr','done','2024-03-25T00:00:00Z','2024-03-25T10:00:00Z','2024-03-24T00:00:00Z','2024-03-25T11:00:00Z'),
('ak-058','call','Reinigungsroboter Klinikum Vorgespräch','Pflegeteam sehr aufgeschlossen','co-04','ct-016','dl-30','usr-kf','done','2024-03-05T14:00:00Z','2024-03-05T14:30:00Z','2024-03-03T00:00:00Z','2024-03-05T15:00:00Z'),
('ak-059','email','Nilfisk Technische Daten Klinikum',NULL,'co-04','ct-016','dl-32','usr-kf','done','2024-03-12T00:00:00Z','2024-03-12T09:00:00Z','2024-03-10T00:00:00Z','2024-03-12T10:00:00Z'),
('ak-060','meeting','Werbewerkstatt Design-Besprechung','Muster und Farbprofile abgestimmt','co-20','ct-097','dl-35','usr-rb','done','2024-03-15T10:00:00Z','2024-03-15T12:00:00Z','2024-03-12T00:00:00Z','2024-03-15T13:00:00Z'),
('ak-061','call','Verpackungsdruck Fleischerei Anfrage','Verpackungsdesign besprochen','co-11','ct-051','dl-36','usr-rb','done','2024-03-05T11:00:00Z','2024-03-05T11:30:00Z','2024-03-03T00:00:00Z','2024-03-05T12:00:00Z'),
('ak-062','email','Angebot Verpackungsdruck Dörner',NULL,'co-11','ct-051','dl-36','usr-rb','done','2024-03-12T00:00:00Z','2024-03-12T09:00:00Z','2024-03-10T00:00:00Z','2024-03-12T10:00:00Z'),
('ak-063','call','Schulzentrum IT-Kombi-Paket','POM + WLAN zusammen günstiger','co-10','ct-049','dl-37','usr-ce','done','2024-02-15T11:00:00Z','2024-02-15T11:30:00Z','2024-02-13T00:00:00Z','2024-02-15T12:00:00Z'),
('ak-064','meeting','KAM Review Schulzentrum','Kombiangebot detailliert besprochen','co-10','ct-046','dl-37','usr-ce','done','2024-03-08T09:00:00Z','2024-03-08T11:00:00Z','2024-03-05T00:00:00Z','2024-03-08T12:00:00Z'),
('ak-065','call','Proxmox Bundle Klinik Abschluss','CF + Proxmox, alles unterschrieben','co-19','ct-091','dl-38','usr-ak2','done','2024-03-04T14:00:00Z','2024-03-04T14:20:00Z','2024-03-03T00:00:00Z','2024-03-04T15:00:00Z'),
('ak-066','email','Wartungsprotokoll Ravensberger Q1',NULL,'co-06','ct-028',NULL,'usr-hd','done','2024-04-01T00:00:00Z','2024-04-01T08:00:00Z','2024-03-28T00:00:00Z','2024-04-01T09:00:00Z'),
('ak-067','call','MPS Review Schulzentrum Q1','Alle 5 Geräte laufen, 0 Störungen','co-10','ct-050',NULL,'usr-mm','done','2024-04-01T10:00:00Z','2024-04-01T10:30:00Z','2024-03-28T00:00:00Z','2024-04-01T11:00:00Z'),
('ak-068','meeting','Kemper Showroom-Besuch','Neugeräte besichtigt, sehr begeistert','co-09','ct-041','dl-07','usr-db2','done','2024-03-15T14:00:00Z','2024-03-15T16:00:00Z','2024-03-12T00:00:00Z','2024-03-15T17:00:00Z'),
('ak-069','task','Verlängerungsangebot Westfalia RFID','Vertrag läuft April 30 aus','co-07','ct-031',NULL,'usr-hbr','open','2024-04-08T09:00:00Z',NULL,'2024-03-25T00:00:00Z','2024-03-25T00:00:00Z'),
('ak-070','email','Quartalsreport CF Stadtwerke','CF Analytics Report Q1 2024','co-05','ct-021',NULL,'usr-aw','done','2024-04-01T00:00:00Z','2024-04-01T09:00:00Z','2024-03-28T00:00:00Z','2024-04-01T10:00:00Z'),
('ak-071','call','Schneideplotter Preis KW','Finalpreis verhandelt','co-13','ct-061','dl-28','usr-cd','open','2024-04-10T10:00:00Z',NULL,'2024-03-28T00:00:00Z','2024-03-28T00:00:00Z'),
('ak-072','note','Kreishandwerkerschaft Status','Entscheidung nach Jahreshauptversammlung','co-18','ct-086','dl-09','usr-db2','done','2024-03-25T11:00:00Z','2024-03-25T11:00:00Z','2024-03-24T00:00:00Z','2024-03-25T12:00:00Z'),
('ak-073','call','WLAN MDE Kombi Logistik Weser','Kombinationsangebot präsentiert','co-01','ct-001','dl-39','usr-hbr','done','2024-02-20T10:00:00Z','2024-02-20T11:00:00Z','2024-02-18T00:00:00Z','2024-02-20T12:00:00Z'),
('ak-074','meeting','Fachklinik Backup Konzept','PBS + Offsite Backup geplant','co-19','ct-092',NULL,'usr-ak2','open','2024-04-15T10:00:00Z',NULL,'2024-03-28T00:00:00Z','2024-03-28T00:00:00Z'),
('ak-075','email','Angebot RFID Asset Lippstädter',NULL,'co-17','ct-081','dl-05','usr-hbr','done','2024-03-01T00:00:00Z','2024-03-01T09:00:00Z','2024-02-28T00:00:00Z','2024-03-01T10:00:00Z'),
('ak-076','call','Druckerei Erweiterung 15 Geräte','Expansion geplant, 15 Zusatzgeräte','co-03','ct-011','dl-10','usr-mm','done','2024-03-05T11:00:00Z','2024-03-05T11:30:00Z','2024-03-03T00:00:00Z','2024-03-05T12:00:00Z'),
('ak-077','task','Quartalsreview Lager Westfalia','AutoID Performance Review Q1','co-07','ct-032',NULL,'usr-hbr','open','2024-04-12T09:00:00Z',NULL,'2024-03-28T00:00:00Z','2024-03-28T00:00:00Z'),
('ak-078','call','Sportpark WLAN Erweiterung Status','Beauftragung noch ausstehend','co-16','ct-076','dl-22','usr-hd','open','2024-04-05T11:00:00Z',NULL,'2024-03-25T00:00:00Z','2024-03-25T00:00:00Z'),
('ak-079','email','Mimaki Technische Specs Messe Bielefeld','Druckbreite und Auflösung bestätigt','co-08','ct-036','dl-27','usr-cd','done','2024-03-22T00:00:00Z','2024-03-22T09:00:00Z','2024-03-20T00:00:00Z','2024-03-22T10:00:00Z'),
('ak-080','meeting','Jahresgespräch Blitz Reinigung','Zweites Gerät besprochen, Budget genehmigt','co-14','ct-066',NULL,'usr-lk','done','2024-03-28T14:00:00Z','2024-03-28T15:30:00Z','2024-03-25T00:00:00Z','2024-03-28T16:00:00Z');

-- ══════════════════════════════════════════════
-- TICKETS (10 Tickets)
-- ══════════════════════════════════════════════
INSERT INTO tickets (id,ticket_number,subject,description,company_id,contact_id,assigned_to,bereich,priority,status,erp_service_id,created_at,updated_at) VALUES
('tk-01','TK-2024-001','MFP offline - Etage 3 Druckerei','Gerät meldet offline, keine Verbindung zum Printserver','co-03','ct-013','usr-zf','POM','high','in_progress','SRV-001','2024-03-28T08:30:00Z','2024-03-28T09:00:00Z'),
('tk-02','TK-2024-002','Zebra TC78 Akku hält nicht','4 Geräte haben defekte Akkus nach 6 Monaten','co-01','ct-002','usr-hbr','ITS','medium','open','SRV-002','2024-03-25T10:00:00Z','2024-03-25T10:00:00Z'),
('tk-03','TK-2024-003','UniFi AP fällt immer wieder aus','AP in Konferenzraum verliert Verbindung alle 2h','co-06','ct-028','usr-mh','eWLAN','medium','in_progress','SRV-003','2024-03-20T14:00:00Z','2024-03-21T09:00:00Z'),
('tk-04','TK-2024-004','Cloudflare Access blockiert Nutzer','15 User können sich nicht mehr anmelden nach Policy-Update','co-05','ct-021','usr-aw','Cloudflare','high','resolved','SRV-004','2024-03-15T09:00:00Z','2024-03-15T16:00:00Z'),
('tk-05','TK-2024-005','Proxmox VM startet nicht','VM dc-srv-02 bootet nicht mehr nach Update','co-19','ct-093','usr-ak2','Proxmox','high','resolved',NULL,'2024-03-10T11:00:00Z','2024-03-10T15:00:00Z'),
('tk-06','TK-2024-006','RFID-Reader lesefehler Tor 2','Reader am Eingang Tor 2 liest nur 60% der Tags','co-07','ct-031','usr-hbr','ITS','medium','open',NULL,'2024-04-01T07:30:00Z','2024-04-01T07:30:00Z'),
('tk-07','TK-2024-007','Cleanfix Roboter fährt Fehlermuster','Roboter dreht Kreise statt vorgegebene Route','co-14','ct-066','usr-lk','Robotik','high','open',NULL,'2024-04-01T08:00:00Z','2024-04-01T08:00:00Z'),
('tk-08','TK-2024-008','LFP Drucker Streifenbildung','Roland UV-Drucker zeigt Streifenmuster in Druckausgabe','co-08','ct-038','usr-cd','LFP','medium','in_progress',NULL,'2024-03-29T14:00:00Z','2024-03-29T15:00:00Z'),
('tk-09','TK-2024-009','PaperCut keine Kostenstellen','PaperCut zeigt seit Update keine Kostenstellen mehr','co-10','ct-050','usr-mm','POM','low','open',NULL,'2024-03-27T09:00:00Z','2024-03-27T09:00:00Z'),
('tk-10','TK-2024-010','Digitaldruck Farbprofil falsch','CMYK-Profil stimmt nicht mit Kundenvorgabe überein','co-20','ct-096','usr-rb','Digitaldruckerei','medium','open',NULL,'2024-04-01T10:00:00Z','2024-04-01T10:00:00Z');

-- ══════════════════════════════════════════════
-- CONTRACTS (40 Serviceverträge)
-- ══════════════════════════════════════════════
INSERT INTO contracts (id,contract_number,company_id,product,bereich,contract_type,start_date,end_date,auto_renew,renew_months,monthly_value,sla_type,sla_status,status,owner_id,notes,created_at,updated_at) VALUES
-- POM Verträge
('sv-01','SV-2401-POM','co-03','MPS Full-Service 45 MFP',       'POM','MPS Klick',  '2024-01-01','2026-12-31',1,12,3850,'4h Vor-Ort','ok',    'active','usr-pn','Konica Minolta Fleet, 36 Monate','2024-01-05T00:00:00Z','2024-01-05T00:00:00Z'),
('sv-02','SV-2402-POM','co-09','Kyocera Druckerflotte 8 MFP',    'POM','Full-Service','2023-01-01','2025-12-31',1,12, 890,'NBD','ok',         'active','usr-pn',NULL,'2023-01-10T00:00:00Z','2023-01-10T00:00:00Z'),
('sv-03','SV-2403-POM','co-10','PaperCut NG + 5 MFP Wartung',   'POM','Support',    '2023-04-01','2026-03-31',1,12, 620,'NBD','ok',         'active','usr-mm',NULL,'2023-04-05T00:00:00Z','2023-04-05T00:00:00Z'),
('sv-04','SV-2404-POM','co-11','Digitaldruckmaschinen Service', 'POM','Wartung',    '2023-07-01','2025-06-30',0,12, 380,'NBD','ok',         'active','usr-rb',NULL,'2023-07-05T00:00:00Z','2023-07-05T00:00:00Z'),
('sv-05','SV-2405-POM','co-18','Print-Audit Rahmenvertrag',      'POM','Support',    '2024-03-01','2025-02-28',0,12, 250,'5T Remote','ok',  'active','usr-db2',NULL,'2024-03-05T00:00:00Z','2024-03-05T00:00:00Z'),
-- AutoID Verträge
('sv-06','SV-2401-AID','co-01','MDE-Fleet 120 Geräte Wartung',  'AutoID','Support', '2024-01-01','2026-12-31',1,12,1890,'4h Remote','ok',  'active','usr-hbr','Zebra Geräte inkl. Ersatzgeräte','2024-01-10T00:00:00Z','2024-01-10T00:00:00Z'),
('sv-07','SV-2402-AID','co-07','RFID Wartungsvertrag',           'ITS','Support', '2023-05-01','2025-04-30',0,12, 680,'8h Remote','ok',  'active','usr-hbr',NULL,'2023-05-05T00:00:00Z','2023-05-05T00:00:00Z'),
('sv-08','SV-2403-AID','co-17','Barcode-Scanner Support 50 Stk','ITS','Support', '2023-02-01','2025-01-31',1,12, 320,'NBD','ok',        'active','usr-hbr',NULL,'2023-02-05T00:00:00Z','2023-02-05T00:00:00Z'),
('sv-09','SV-2404-AID','co-01','Zebra TC78 Fullservice 120 Stk','ITS','Full-Service','2024-02-01','2027-01-31',1,12,2240,'4h Vor-Ort','ok','active','usr-hbr','Inkl. Ersatzgerätepool','2024-02-05T00:00:00Z','2024-02-05T00:00:00Z'),
('sv-10','SV-2405-AID','co-07','MDE Außendienst Support',        'ITS','Support', '2024-03-01','2026-02-28',1,12, 450,'NBD','ok',        'active','usr-hbr',NULL,'2024-03-05T00:00:00Z','2024-03-05T00:00:00Z'),
-- Cloudflare Verträge
('sv-11','SV-2401-CF', 'co-05','CF ZTNA Essentials 80 User',    'Cloudflare','MSSP','2024-03-01','2028-02-28',1,48,1340,'4h Remote','ok',  'active','usr-aw','48 Monate MSSP-Vertrag','2024-03-05T00:00:00Z','2024-03-05T00:00:00Z'),
('sv-12','SV-2402-CF', 'co-05','CF Gateway + Email Security',   'Cloudflare','MSSP','2024-02-01','2026-01-31',1,24, 420,'4h Remote','ok',  'active','usr-hb2',NULL,'2024-02-05T00:00:00Z','2024-02-05T00:00:00Z'),
('sv-13','SV-2403-CF', 'co-05','CF R2 + Pages Infrastruktur',   'Cloudflare','SaaS-Lizenz','2024-04-01','2025-03-31',1,12, 180,'5T Remote','ok','active','usr-hd',NULL,'2024-04-01T00:00:00Z','2024-04-01T00:00:00Z'),
('sv-14','SV-2404-CF', 'co-12','CF Zero Trust POC Begleitung',  'Cloudflare','MSSP','2024-02-01','2024-07-31',0,6,  890,'4h Remote','ok',  'active','usr-aw','Pilotphase 6 Monate','2024-02-05T00:00:00Z','2024-02-05T00:00:00Z'),
('sv-15','SV-2405-CF', 'co-19','CF Access Fachklinik',          'Cloudflare','MSSP','2024-03-01','2026-02-28',1,24, 560,'4h Remote','ok',  'active','usr-ak2',NULL,'2024-03-05T00:00:00Z','2024-03-05T00:00:00Z'),
-- Proxmox Verträge
('sv-16','SV-2401-PRX','co-19','Proxmox Cluster 3 Nodes Support','Proxmox','Support','2024-01-15','2027-01-14',1,36, 680,'4h Remote','ok', 'active','usr-ak2',NULL,'2024-01-20T00:00:00Z','2024-01-20T00:00:00Z'),
('sv-17','SV-2402-PRX','co-19','Proxmox Backup Server',         'Proxmox','Support', '2024-03-01','2026-02-28',1,24, 280,'NBD','ok',       'active','usr-ak2',NULL,'2024-03-05T00:00:00Z','2024-03-05T00:00:00Z'),
('sv-18','SV-2403-PRX','co-15','Proxmox Support & Monitoring',  'Proxmox','Support', '2024-03-01','2025-02-28',1,12, 420,'8h Remote','ok', 'active','usr-ak2',NULL,'2024-03-05T00:00:00Z','2024-03-05T00:00:00Z'),
-- eWLAN Verträge
('sv-19','SV-2301-WLN','co-06','UniFi Campus 80 AP Wartung',    'eWLAN','Support',  '2023-06-01','2026-05-31',1,36, 780,'4h Vor-Ort','ok', 'active','usr-hd','Komplette WLAN-Infrastruktur Hotel','2023-06-05T00:00:00Z','2023-06-05T00:00:00Z'),
('sv-20','SV-2302-WLN','co-16','Sportpark WLAN 30 AP',          'eWLAN','Support',  '2023-05-01','2025-04-30',0,12, 320,'NBD','ok',        'active','usr-hd',NULL,'2023-05-05T00:00:00Z','2023-05-05T00:00:00Z'),
('sv-21','SV-2303-WLN','co-02','Kanzlei Netzwerk Betreuung',    'eWLAN','Support',  '2024-04-01','2025-03-31',1,12, 280,'NBD','ok',        'active','usr-hb2',NULL,'2024-04-01T00:00:00Z','2024-04-01T00:00:00Z'),
-- LFP Verträge
('sv-22','SV-2301-LFP','co-08','Roland UV-Drucker Wartung',     'LFP','Wartung',    '2023-09-01','2026-08-31',1,36,1240,'4h Vor-Ort','ok', 'active','usr-cd',NULL,'2023-09-05T00:00:00Z','2023-09-05T00:00:00Z'),
('sv-23','SV-2302-LFP','co-13','HP Latex Wartungsvertrag',      'LFP','Wartung',    '2022-11-01','2025-10-31',1,36, 680,'4h Vor-Ort','ok', 'active','usr-cd',NULL,'2022-11-05T00:00:00Z','2022-11-05T00:00:00Z'),
('sv-24','SV-2303-LFP','co-08','Mimaki Service & Verbrauch',    'LFP','Full-Service','2023-09-01','2026-08-31',1,36,1890,'4h Vor-Ort','warning','active','usr-cd','SLA-Warnung: Reaktionszeit letzte Woche 5h','2023-09-05T00:00:00Z','2024-04-01T00:00:00Z'),
-- Robotik Verträge
('sv-25','SV-2401-ROB','co-14','Cleanfix RA660 Wartung + Update','Robotik','Wartung','2024-01-01','2026-12-31',1,36, 480,'NBD','ok',        'active','usr-lk',NULL,'2024-01-05T00:00:00Z','2024-01-05T00:00:00Z'),
('sv-26','SV-2402-ROB','co-14','Roboter Fleet Management',      'Robotik','SaaS-Lizenz','2024-01-01','2025-12-31',1,24, 180,'5T Remote','ok','active','usr-kf',NULL,'2024-01-05T00:00:00Z','2024-01-05T00:00:00Z'),
-- Digitaldruckerei
('sv-27','SV-2301-DIG','co-11','Druckmaschinen Jahreswartung',  'Digitaldruckerei','Wartung','2023-07-01','2025-06-30',1,24, 420,'NBD','ok','active','usr-rb',NULL,'2023-07-05T00:00:00Z','2023-07-05T00:00:00Z'),
('sv-28','SV-2302-DIG','co-20','RIP-Software + Support',        'Digitaldruckerei','SaaS-Lizenz','2023-03-01','2025-02-28',1,24, 280,'5T Remote','ok','active','usr-rb',NULL,'2023-03-05T00:00:00Z','2023-03-05T00:00:00Z'),
('sv-29','SV-2303-DIG','co-20','Digitaldruckmaschine Wartung',  'Digitaldruckerei','Wartung','2023-03-01','2025-02-28',1,24, 380,'4h Vor-Ort','ok','active','usr-rb',NULL,'2023-03-05T00:00:00Z','2023-03-05T00:00:00Z'),
-- Kombipakete / Weitere
('sv-30','SV-2401-KOM','co-10','POM + IT Kombi Schulzentrum',   'POM','Full-Service','2023-04-01','2026-03-31',1,36, 890,'NBD','ok',        'active','usr-ce',NULL,'2023-04-05T00:00:00Z','2023-04-05T00:00:00Z'),
('sv-31','SV-2402-KOM','co-19','CF + Proxmox Bundle Klinik',    'Proxmox','MSSP',   '2024-03-01','2027-02-28',1,36,1240,'4h Remote','ok',  'active','usr-ak2',NULL,'2024-03-05T00:00:00Z','2024-03-05T00:00:00Z'),
('sv-32','SV-2403-KOM','co-01','AutoID + eWLAN Kombi Logistik', 'ITS','Full-Service','2024-02-01','2026-01-31',1,24,1650,'4h Vor-Ort','ok','active','usr-hbr',NULL,'2024-02-05T00:00:00Z','2024-02-05T00:00:00Z'),
-- Auslaufende Verträge (für SLA-Widget)
('sv-33','SV-2201-POM','co-03','Full-Service Altvertrag 10 MFP','POM','Full-Service','2022-01-01','2024-12-31',0,12,1240,'4h Vor-Ort','breach','active','usr-mm','SLA-Bruch letzte Woche, Eskalation läuft','2022-01-05T00:00:00Z','2024-04-01T00:00:00Z'),
('sv-34','SV-2202-AID','co-07','MDE Scanner Altflotte 30 Stk',  'ITS','Support', '2022-05-01','2025-04-30',0,12, 520,'8h Remote','ok',   'active','usr-hbr','Vertrag läuft bald aus','2022-05-05T00:00:00Z','2022-05-05T00:00:00Z'),
('sv-35','SV-2203-LFP','co-13','Schneideplotter Service',       'LFP','Wartung',    '2022-04-01','2024-09-30',0,12, 180,'NBD','warning',    'active','usr-cd','Läuft September aus, Angebot vorbereiten','2022-04-05T00:00:00Z','2024-03-01T00:00:00Z'),
('sv-36','SV-2204-ROB','co-04','Roboter Pilotvertrag Klinikum', 'POM','Wartung','2024-04-01','2025-03-31',0,12, 380,'NBD','ok',         'active','usr-lk','Pilotphase für Klinikum OWL','2024-04-01T00:00:00Z','2024-04-01T00:00:00Z'),
('sv-37','SV-2205-WLN','co-05','SD-WAN Monitoring Stadtwerke',  'eWLAN','MSSP',    '2024-04-01','2025-03-31',1,12, 340,'4h Remote','ok',    'active','usr-aw',NULL,'2024-04-01T00:00:00Z','2024-04-01T00:00:00Z'),
('sv-38','SV-2206-CF', 'co-19','CF Access Enterprise',          'Cloudflare','MSSP','2024-03-01','2026-02-28',1,24, 780,'4h Remote','ok',   'active','usr-ak2',NULL,'2024-03-05T00:00:00Z','2024-03-05T00:00:00Z'),
('sv-39','SV-2207-PRX','co-19','Proxmox Enterprise Subscription','Proxmox','SaaS-Lizenz','2024-01-01','2024-12-31',1,12, 180,'5T Remote','ok','active','usr-ak2',NULL,'2024-01-05T00:00:00Z','2024-01-05T00:00:00Z'),
('sv-40','SV-2208-DIG','co-08','Digitaldruckaufträge Rahmenvert','Digitaldruckerei','Full-Service','2024-01-01','2024-12-31',1,12,1280,'3T','ok','active','usr-rb','Messematerialien 2024','2024-01-05T00:00:00Z','2024-01-05T00:00:00Z');

-- Produkt-/Leistungskatalog Beispieleinträge
INSERT OR IGNORE INTO products (id, name, description, category, unit, price, vat_rate, is_active, sku, created_at, updated_at) VALUES
  ('prod-001', 'Cloudflare Zero Trust Lizenz', 'Cloudflare Zero Trust SASE-Plattform, jährliche Lizenz pro User', 'Software/Lizenzen', 'User/Jahr', 120.00, 19, 1, 'CF-ZT-USER', datetime('now'), datetime('now')),
  ('prod-002', 'Managed Security Service', 'Monatlicher Managed Security Service inkl. Monitoring & Incident Response', 'Dienstleistungen', 'Monat', 890.00, 19, 1, 'MSS-MON', datetime('now'), datetime('now')),
  ('prod-003', 'IT-Sicherheits-Audit', 'Umfassendes IT-Sicherheitsaudit inkl. Bericht und Handlungsempfehlungen', 'Dienstleistungen', 'pauschal', 2400.00, 19, 1, 'AUDIT-IT', datetime('now'), datetime('now')),
  ('prod-004', 'Netzwerk-Switch 24-Port', 'Managed Gigabit Switch 24-Port inkl. Konfiguration', 'Hardware', 'Stück', 380.00, 19, 1, 'NET-SW24', datetime('now'), datetime('now')),
  ('prod-005', 'Firewall Appliance', 'Next-Generation Firewall Appliance inkl. 1 Jahr Support', 'Hardware', 'Stück', 1290.00, 19, 1, 'FW-NGFW', datetime('now'), datetime('now')),
  ('prod-006', 'Wartungsvertrag Standard', 'Monatlicher IT-Wartungsvertrag bis 25 Geräte, 8x5 Support', 'Wartung/Support', 'Monat', 490.00, 19, 1, 'WART-STD', datetime('now'), datetime('now')),
  ('prod-007', 'Wartungsvertrag Premium', 'Monatlicher IT-Wartungsvertrag bis 50 Geräte, 24x7 Support', 'Wartung/Support', 'Monat', 990.00, 19, 1, 'WART-PREM', datetime('now'), datetime('now')),
  ('prod-008', 'Microsoft 365 Business Standard', 'Microsoft 365 Business Standard Lizenz, monatlich', 'Software/Lizenzen', 'User/Monat', 12.50, 19, 1, 'MS365-BS', datetime('now'), datetime('now')),
  ('prod-009', 'Schulung IT-Sicherheit', 'Ganztages-Schulung IT-Sicherheit & Awareness für Mitarbeiter', 'Dienstleistungen', 'Tag', 1200.00, 19, 1, 'SCHU-ITSEC', datetime('now'), datetime('now')),
  ('prod-010', 'Notebook Business', 'Business-Notebook 14" inkl. Windows 11 Pro und Konfiguration', 'Hardware', 'Stück', 1190.00, 19, 1, 'NB-BIZ14', datetime('now'), datetime('now'));

-- ══════════════════════════════════════════════
-- ZIELE & QUOTEN (Ertragsziele)
-- ══════════════════════════════════════════════
-- Individuelle Ertragsziele 2026
INSERT OR REPLACE INTO targets (id, type, ref_id, period_type, period_year, margin_target, revenue_target, created_at, updated_at) VALUES
('tgt-aw-2026', 'user', 'usr-aw',  'year', 2026, 400000, 400000, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
('tgt-hbr-2026','user', 'usr-hbr', 'year', 2026, 160000, 160000, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
('tgt-hb2-2026','user', 'usr-hb2', 'year', 2026, 120000, 120000, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
('tgt-hd-2026', 'user', 'usr-hd',  'year', 2026, 100000, 100000, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
('tgt-so-2026', 'user', 'usr-so',  'year', 2026,  80000,  80000, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
('tgt-mh-2026', 'user', 'usr-mh',  'year', 2026, 140000, 140000, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z');

-- Ertragsziele 2025 (Vorjahr)
INSERT OR REPLACE INTO targets (id, type, ref_id, period_type, period_year, margin_target, revenue_target, created_at, updated_at) VALUES
('tgt-aw-2025', 'user', 'usr-aw',  'year', 2025, 350000, 350000, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
('tgt-hbr-2025','user', 'usr-hbr', 'year', 2025, 120000, 120000, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z');

-- ══════════════════════════════════════════════
-- DEALS 2025 (Vorjahres-Abschlüsse für Reporting)
-- Axel Weichert: 375.000 € Ertrag (Ziel: 350.000 €)
-- Henning Brinker: 120.000 € Ertrag (Ziel: 120.000 €)
-- ══════════════════════════════════════════════
INSERT OR IGNORE INTO deals
  (id,title,company_id,owner_id,bereich,stage,value,cost_value,margin_value,margin_percent,probability,status,created_at,updated_at)
VALUES
-- Axel Weichert 2025 — updated_at = Abschlussdatum (Fallback für Jahresfilter)
('dl-aw25-01','CF ZeroTrust Rollout Stadtwerke Herford',   'co-05','usr-aw','Cloudflare','won',285000,175000, 110000,38.6,100,'open','2024-11-01T00:00:00Z','2025-02-14T00:00:00Z'),
('dl-aw25-02','SD-WAN Erweiterung Phase 2',                'co-05','usr-aw','ITS',       'won',190000,120000,  70000,36.8,100,'open','2024-12-01T00:00:00Z','2025-03-28T00:00:00Z'),
('dl-aw25-03','Proxmox Cluster Fachklinik Senne',          'co-19','usr-aw','Proxmox',   'won',165000, 98000,  67000,40.6,100,'open','2025-01-15T00:00:00Z','2025-05-09T00:00:00Z'),
('dl-aw25-04','IT-Infrastruktur EWG Minden Komplett',      'co-12','usr-aw','ITS',       'won',142000, 89000,  53000,37.3,100,'open','2025-02-10T00:00:00Z','2025-06-20T00:00:00Z'),
('dl-aw25-05','CF Access Enterprise Lippstädter Metall',   'co-17','usr-aw','Cloudflare','won', 98000, 61000,  37000,37.8,100,'open','2025-04-01T00:00:00Z','2025-08-05T00:00:00Z'),
('dl-aw25-06','Network Refresh Westfalia GmbH',            'co-07','usr-aw','ITS',       'won', 72000, 46000,  26000,36.1,100,'open','2025-06-01T00:00:00Z','2025-09-17T00:00:00Z'),
('dl-aw25-07','Ubiquiti Campus WLAN Schulzentrum Enger',   'co-10','usr-aw','ITS',       'won', 31000, 19500,  11500,37.1,100,'open','2025-08-15T00:00:00Z','2025-11-03T00:00:00Z'),
('dl-aw25-08','Cloudflare R2 Archivlösung',                'co-12','usr-aw','Cloudflare','won',  2800,  1300,   1500,53.6,100,'open','2025-11-01T00:00:00Z','2025-12-19T00:00:00Z'),
-- Henning Brinker 2025 — updated_at = Abschlussdatum
('dl-hbr25-01','MDE Rollout Logistik Weser Phase 2',       'co-01','usr-hbr','AutoID',   'won',185000,118000,  67000,36.2,100,'open','2024-12-05T00:00:00Z','2025-03-11T00:00:00Z'),
('dl-hbr25-02','RFID Track & Trace Lager Westfalia',       'co-07','usr-hbr','AutoID',   'won', 92000, 59000,  33000,35.9,100,'open','2025-02-20T00:00:00Z','2025-06-04T00:00:00Z'),
('dl-hbr25-03','Handscanner-Fleet Lippstädter Metall',     'co-17','usr-hbr','AutoID',   'won', 38000, 23500,  14500,38.2,100,'open','2025-05-10T00:00:00Z','2025-08-22T00:00:00Z'),
('dl-hbr25-04','Zebra Drucker Etikettierung co-01',        'co-01','usr-hbr','AutoID',   'won', 14500,  9100,   5400,37.2,100,'open','2025-08-01T00:00:00Z','2025-10-14T00:00:00Z'),
('dl-hbr25-05','AutoID Wartungsvertrag 2025',              'co-07','usr-hbr','AutoID',   'won',  2800,  2700,    100, 3.6,100,'open','2025-11-15T00:00:00Z','2025-12-01T00:00:00Z');
