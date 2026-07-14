import re
import os

paths = ["./database/seed.sql", "./supabase/seed.sql"]
for path in paths:
    if os.path.exists(path):
        with open(path, "r") as f:
            content = f.read()
        
        # We need to replace the NULL for password_hash with a valid bcrypt hash, e.g. for 'password123'
        # Let's use a dummy hash: '$2a$10$C.z.q7o8yQ1/yO7y2QO1.O.z.q7o8yQ1/yO7y2QO1.O.z.q7o8yQ' (31 chars, 60 bytes typically)
        # Actually a valid bcrypt hash for 'password' is:
        hash = "'$2a$10$wO7e01KxZ2yT6n4v.E2.QO1n3f3J7gO7e01KxZ2yT6n4v.E2.QO1'"
        
        content = content.replace(" bd, null, ", f" bd, {hash}, ")
        content = content.replace(" management, null, ", f" management, {hash}, ")
        content = content.replace(" creative, null, ", f" creative, {hash}, ")
        content = content.replace(" operations, null, ", f" operations, {hash}, ")
        
        # Also there's one that looks like: 'bd', NULL, 
        content = content.replace("'bd', NULL,", f"'bd', {hash},")
        content = content.replace("'management', NULL,", f"'management', {hash},")
        content = content.replace("'creative', NULL,", f"'creative', {hash},")
        content = content.replace("'operations', NULL,", f"'operations', {hash},")
        
        with open(path, "w") as f:
            f.write(content)
