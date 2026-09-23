import argparse
import os
import shutil
import subprocess
import sys
import argparse
from pathlib import Path
from google.cloud import storage


DEFAULT_BUCKET = os.getenv("GCS_BUCKET_NAME")
DEFAULT_PREFIX = os.getenv("GCS_BUCKET_PREFIX", "nightlydigest").strip("/")
DEFAULT_BUILD_DIR = os.getenv("BUILD_DIR", "dist")
DEFAULT_VITE_BACKEND_URL = os.getenv("VITE_BACKEND_URL")

def parse_args():
    parser = argparse.ArgumentParser(
        description="Build and deploy static React/Vite app to Google Cloud Storage."
    )
    parser.add_argument(
        "--only-clean",
        action="store_true",
        help="Only delete existing files in the bucket prefix and skip build and upload steps.",
    )
    parser.add_argument(
        "--only-upload",
        action="store_true",
        help="Only upload existing files to the bucket prefix and skip build and clean steps.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate the execution without deleting or uploading files to GCS.",
    )
    parser.add_argument(
        "--bucket",
        default=DEFAULT_BUCKET,
        help="GCS bucket name (defaults to GCS_BUCKET_NAME env var).",
    )
    parser.add_argument(
        "--prefix",
        default=DEFAULT_PREFIX,
        help="Target subfolder in GCS bucket (defaults to GCS_BUCKET_PREFIX or 'nightlydigest').",
    )
    parser.add_argument(
        "--build-dir",
        default=DEFAULT_BUILD_DIR,
        help="Local build output directory (defaults to BUILD_DIR or 'dist').",
    )
    parser.add_argument(
        "--backend-url",
        default=DEFAULT_VITE_BACKEND_URL,
        help="Backend API full url, e.g. https://backend-host/nightlydigest/api (defaults to VITE_BACKEND_URL env var)."
    )
    return parser.parse_args()

def validate_config(bucket_name, backend_url):
    """Validates that required environment variables are present."""
    error = not bucket_name or not backend_url
    if not bucket_name:
        print("Error: GCS_BUCKET_NAME environment variable is not set.")
        print("Provide it via '--bucket <name>' or set the GCS_BUCKET_NAME environment variable.")

    if not backend_url:
        print("Error: VITE_BACKEND_URL environment variable is not set.")
        print("Provide it via '--backend-url <url>' or set the VITE_BACKEND_URL environment variable.")

    if error:
        sys.exit(1)

def remove_build_directory(build_dir, dry_run=False):
    """Removes the existing local build output directory."""
    if not os.path.isdir(build_dir):
        return

    if dry_run:
        print(f"[DRY-RUN] Would remove build directory: {build_dir}")
    else:
        shutil.rmtree(build_dir)
        print(f"Removed existing build directory: {build_dir}")

def run_vite_build(dry_run=False):
    """Runs the Vite production build command."""
    if dry_run:
        print("[DRY-RUN] Would run Vite build command: 'npx vite build'")
        return

    print("Starting Vite build...")
    try:
        os.environ['VITE_SCIENTIFIC_NIGHTLY_DIGEST'] = 'true'
        subprocess.run(["npx", "vite", "build"], check=True)
        print("Build completed successfully.")
    except subprocess.CalledProcessError as e:
        print(f"Error during Vite build: {e}")
        sys.exit(1)

def clear_folder_contents(bucket_name, prefix, dry_run=False):
    """Deletes only the files inside a specific folder prefix in the bucket."""
    client = storage.Client()
    
    search_prefix = f"{prefix}/" if prefix else ""
    target_display = f"gs://{bucket_name}/{search_prefix}" if search_prefix else f"gs://{bucket_name}"
    
    print(f"Clearing existing files under {target_display}...")
    
    blobs = list(client.list_blobs(bucket_name, prefix=search_prefix if prefix else None))
    if not blobs:
        print("   -> Target folder is already empty.")
        return

    deleted_count = 0
    for blob in blobs:
        if prefix and not blob.name.startswith(search_prefix):
            continue
            
        if dry_run:
            print(f"   -> [DRY-RUN] Would delete file: {blob.name}")
        else:
            blob.delete()
            print(f"   -> Deleted old file: {blob.name}")
        deleted_count += 1
        
    print(f"Cleared {deleted_count} old files successfully.")

def upload_directory_to_gcs(bucket_name, prefix, source_dir, dry_run=False):
    """Recursively uploads the built static folder to a GCS bucket."""
    if not os.path.isdir(source_dir):
        print(f"Error: Build directory '{source_dir}' not found.")
        sys.exit(1)

    print(f"Connecting to Google Cloud Storage (Bucket: {bucket_name})...")
    client = storage.Client()
    bucket = client.bucket(bucket_name)

    source_path = Path(source_dir)
    file_paths = [path for path in source_path.rglob("*") if path.is_file()]
    
    prefix = prefix.strip("/") if prefix else ""
    destination_display = f"gs://{bucket_name}/{prefix}/" if prefix else f"gs://{bucket_name}/"
    print(f"Uploading {len(file_paths)} new files to {destination_display}...")

    for file_path in file_paths:
        relative_path = file_path.relative_to(source_path)
        normalized_relative_path = str(relative_path).replace("\\", "/")
        
        blob_name = f"{prefix}/{normalized_relative_path}" if prefix else normalized_relative_path
        blob = bucket.blob(blob_name)

        if file_path.suffix == ".html":
            blob.content_type = "text/html"
        elif file_path.suffix == ".js":
            blob.content_type = "application/javascript"
        elif file_path.suffix == ".css":
            blob.content_type = "text/css"

        if file_path.name == "index.html":
            # Prevents CDN and browsers from caching index.html
            blob.cache_control = "no-cache, no-store, must-revalidate"
            
        if dry_run:
            print(f"   -> [DRY-RUN] Would upload: {blob_name}")
        else:
            blob.upload_from_filename(str(file_path))
            print(f"   -> Uploaded: {blob_name}")

    print("Deployment to Google Cloud Storage completed successfully!")

if __name__ == "__main__":
    args = parse_args()
    validate_config(args.bucket, args.backend_url)

    if args.dry_run:
        print("=== RUNNING IN DRY-RUN MODE (No changes will be applied) ===\n")

    if args.only_clean:
        clear_folder_contents(args.bucket, args.prefix, dry_run=args.dry_run)

    if args.only_upload:
        upload_directory_to_gcs(args.bucket, args.prefix, args.build_dir, dry_run=args.dry_run)
    
    if not (args.only_clean or args.only_upload):
        remove_build_directory(args.build_dir, dry_run=args.dry_run)
        run_vite_build(dry_run=args.dry_run)
        clear_folder_contents(args.bucket, args.prefix, dry_run=args.dry_run)
        upload_directory_to_gcs(args.bucket, args.prefix, args.build_dir, dry_run=args.dry_run)
