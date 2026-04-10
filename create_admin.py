import os
import subprocess

DB = 'ordering_system_users.db'

def create_admin_user():
    # the db is always in data folder in root of computer
    data_folder = os.path.expanduser('~/data')
    
    db_path = os.path.join(data_folder, DB)
    if not os.path.exists(db_path):
        print("Database not found. Please run the setup script first.")
        return

    tag_id = input("Enter the tag ID for the admin user (Must be all lowercase)\nYou can find it by running the ordering system and scanning the tag:\n ")
    full_name = input("Enter the full name of the admin:\n")
    
    try:
        if not tag_id or not full_name:
            print("Tag ID and full name cannot be empty.")
            return
        
        subprocess.run(['sqlite3', db_path, f"INSERT INTO users (tag_id, full_name, is_admin, balance) VALUES (lower('{tag_id}'), '{full_name}', 1, 0);"], check=True)
        print("Admin user created successfully.")
        
    except subprocess.CalledProcessError as e:
        print(f"An error occurred while creating the admin user: {e}")
        
if __name__ == "__main__":
    create_admin_user()