CREATE TYPE "public"."jenis_dokumen" AS ENUM('spt', 'kartu_keluarga', 'foto_rumah', 'lainnya');--> statement-breakpoint
CREATE TYPE "public"."jenis_notifikasi" AS ENUM('info', 'success', 'warning', 'error');--> statement-breakpoint
CREATE TYPE "public"."status_keputusan" AS ENUM('diterima', 'ditolak', 'cadangan');--> statement-breakpoint
CREATE TYPE "public"."status_pengajuan" AS ENUM('menunggu_verifikasi', 'data_terverifikasi', 'ditolak', 'diproses', 'diterima');--> statement-breakpoint
CREATE TYPE "public"."status_verifikasi" AS ENUM('valid', 'tidak_valid');--> statement-breakpoint
CREATE TYPE "public"."tipe_kriteria" AS ENUM('benefit', 'cost');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('penduduk', 'petugas', 'admin');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(100) NOT NULL,
	"email" varchar(100) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" "user_role" NOT NULL,
	"nama" varchar(200) NOT NULL,
	"no_telp" varchar(15),
	"profile_pic_url" varchar(500),
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "penduduk" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"nik" varchar(16) NOT NULL,
	"nama_lengkap" varchar(200) NOT NULL,
	"jenis_kelamin" varchar(20),
	"tanggal_lahir" date,
	"alamat" text NOT NULL,
	"desa" varchar(100),
	"kecamatan" varchar(100),
	"kabupaten" varchar(100),
	"no_telp" varchar(15),
	"no_rekening" varchar(20),
	"nama_bank" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "uniq_penduduk_nik" UNIQUE("nik"),
	CONSTRAINT "uniq_penduduk_user_id" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "pengajuan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"penduduk_id" uuid NOT NULL,
	"penghasilan_bulanan" integer NOT NULL,
	"jumlah_tanggungan" integer NOT NULL,
	"kondisi_rumah" varchar(50) NOT NULL,
	"status_pengajuan" "status_pengajuan" DEFAULT 'menunggu_verifikasi' NOT NULL,
	"catatan_penduduk" text,
	"tanggal_pengajuan" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "dokumen_verifikasi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"verifikasi_id" uuid NOT NULL,
	"jenis" varchar(30) NOT NULL,
	"nama_file" varchar(255) NOT NULL,
	"path_relatif" varchar(500) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"ukuran_bytes" integer NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verifikasi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pengajuan_id" uuid NOT NULL,
	"petugas_id" uuid NOT NULL,
	"status_verifikasi" "status_verifikasi" NOT NULL,
	"catatan_verifikasi" text,
	"tanggal_verifikasi" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_verifikasi_pengajuan_id" UNIQUE("pengajuan_id")
);
--> statement-breakpoint
CREATE TABLE "kriteria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kunci" varchar(50) NOT NULL,
	"nama_kriteria" varchar(100) NOT NULL,
	"deskripsi" text,
	"bobot" numeric(5, 4) NOT NULL,
	"tipe_kriteria" "tipe_kriteria" NOT NULL,
	"prioritas" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_kriteria_kunci" UNIQUE("kunci")
);
--> statement-breakpoint
CREATE TABLE "subkriteria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kriteria_id" uuid NOT NULL,
	"kode_nilai" varchar(30),
	"label" varchar(100),
	"nilai_min" integer,
	"nilai_max" integer,
	"score" numeric(6, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "perhitungan_waspas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pengajuan_id" uuid NOT NULL,
	"lambda" numeric(4, 2) NOT NULL,
	"skor_ws" numeric(8, 6) NOT NULL,
	"skor_wp" numeric(8, 6) NOT NULL,
	"skor_akhir" numeric(8, 6) NOT NULL,
	"ranking" integer NOT NULL,
	"dihitung_oleh" uuid NOT NULL,
	"detail" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_waspas_pengajuan_id" UNIQUE("pengajuan_id")
);
--> statement-breakpoint
CREATE TABLE "perhitungan_waspas_detail" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"perhitungan_id" uuid NOT NULL,
	"kriteria_id" uuid NOT NULL,
	"nama_kriteria" varchar(100) NOT NULL,
	"bobot" numeric(5, 4) NOT NULL,
	"nilai_mentah" numeric(16, 2),
	"kode_nilai" varchar(30),
	"score" numeric(8, 6) NOT NULL,
	"kontribusi_ws" numeric(8, 6) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hasil" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pengajuan_id" uuid NOT NULL,
	"ranking" integer NOT NULL,
	"skor_waspas" numeric(8, 6) NOT NULL,
	"status_keputusan" "status_keputusan" NOT NULL,
	"admin_id" uuid NOT NULL,
	"catatan_admin" text,
	"tanggal_keputusan" timestamp with time zone DEFAULT now() NOT NULL,
	"tandatangan_digital" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_hasil_pengajuan_id" UNIQUE("pengajuan_id")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(100),
	"entity_id" uuid,
	"old_values" jsonb,
	"new_values" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"message" text NOT NULL,
	"type" "jenis_notifikasi" DEFAULT 'info' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"action_url" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "penduduk" ADD CONSTRAINT "penduduk_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengajuan" ADD CONSTRAINT "pengajuan_penduduk_id_penduduk_id_fk" FOREIGN KEY ("penduduk_id") REFERENCES "public"."penduduk"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dokumen_verifikasi" ADD CONSTRAINT "dokumen_verifikasi_verifikasi_id_verifikasi_id_fk" FOREIGN KEY ("verifikasi_id") REFERENCES "public"."verifikasi"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dokumen_verifikasi" ADD CONSTRAINT "dokumen_verifikasi_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifikasi" ADD CONSTRAINT "verifikasi_pengajuan_id_pengajuan_id_fk" FOREIGN KEY ("pengajuan_id") REFERENCES "public"."pengajuan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifikasi" ADD CONSTRAINT "verifikasi_petugas_id_users_id_fk" FOREIGN KEY ("petugas_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subkriteria" ADD CONSTRAINT "subkriteria_kriteria_id_kriteria_id_fk" FOREIGN KEY ("kriteria_id") REFERENCES "public"."kriteria"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perhitungan_waspas" ADD CONSTRAINT "perhitungan_waspas_pengajuan_id_pengajuan_id_fk" FOREIGN KEY ("pengajuan_id") REFERENCES "public"."pengajuan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perhitungan_waspas" ADD CONSTRAINT "perhitungan_waspas_dihitung_oleh_users_id_fk" FOREIGN KEY ("dihitung_oleh") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perhitungan_waspas_detail" ADD CONSTRAINT "perhitungan_waspas_detail_perhitungan_id_perhitungan_waspas_id_fk" FOREIGN KEY ("perhitungan_id") REFERENCES "public"."perhitungan_waspas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perhitungan_waspas_detail" ADD CONSTRAINT "perhitungan_waspas_detail_kriteria_id_kriteria_id_fk" FOREIGN KEY ("kriteria_id") REFERENCES "public"."kriteria"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hasil" ADD CONSTRAINT "hasil_pengajuan_id_pengajuan_id_fk" FOREIGN KEY ("pengajuan_id") REFERENCES "public"."pengajuan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hasil" ADD CONSTRAINT "hasil_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_users_deleted_at" ON "users" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "idx_penduduk_nik" ON "penduduk" USING btree ("nik");--> statement-breakpoint
CREATE INDEX "idx_penduduk_deleted_at" ON "penduduk" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "idx_pengajuan_penduduk_id" ON "pengajuan" USING btree ("penduduk_id");--> statement-breakpoint
CREATE INDEX "idx_pengajuan_status" ON "pengajuan" USING btree ("status_pengajuan");--> statement-breakpoint
CREATE INDEX "idx_pengajuan_deleted_at" ON "pengajuan" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "idx_dokumen_verifikasi_id" ON "dokumen_verifikasi" USING btree ("verifikasi_id");--> statement-breakpoint
CREATE INDEX "idx_verifikasi_petugas_id" ON "verifikasi" USING btree ("petugas_id");--> statement-breakpoint
CREATE INDEX "idx_verifikasi_status" ON "verifikasi" USING btree ("status_verifikasi");--> statement-breakpoint
CREATE INDEX "idx_kriteria_is_active" ON "kriteria" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_kriteria_prioritas" ON "kriteria" USING btree ("prioritas");--> statement-breakpoint
CREATE INDEX "idx_subkriteria_kriteria_id" ON "subkriteria" USING btree ("kriteria_id");--> statement-breakpoint
CREATE INDEX "idx_subkriteria_kode_nilai" ON "subkriteria" USING btree ("kriteria_id","kode_nilai");--> statement-breakpoint
CREATE INDEX "idx_waspas_ranking" ON "perhitungan_waspas" USING btree ("ranking");--> statement-breakpoint
CREATE INDEX "idx_waspas_skor" ON "perhitungan_waspas" USING btree ("skor_akhir");--> statement-breakpoint
CREATE INDEX "idx_waspas_detail_perhitungan_id" ON "perhitungan_waspas_detail" USING btree ("perhitungan_id");--> statement-breakpoint
CREATE INDEX "idx_hasil_status" ON "hasil" USING btree ("status_keputusan");--> statement-breakpoint
CREATE INDEX "idx_hasil_ranking" ON "hasil" USING btree ("ranking");--> statement-breakpoint
CREATE INDEX "idx_audit_user_id" ON "audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_created_at" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_entity" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_id" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_is_read" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_read" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_expires_at" ON "refresh_tokens" USING btree ("expires_at");