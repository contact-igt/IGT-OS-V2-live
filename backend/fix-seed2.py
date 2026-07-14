with open("database/seed.sql", "r") as f:
    content = f.read()

content = content.replace("INSERT INTO public.users (id, name, email, role, department) VALUES", "INSERT INTO public.users (id, name, email, role, department, password_hash) VALUES")

# add password_hash to each row
hash = "'$2a$10$wO7e01KxZ2yT6n4v.E2.QO1n3f3J7gO7e01KxZ2yT6n4v.E2.QO1'"

content = content.replace(" 'bd'),", f" 'bd', {hash}),")
content = content.replace(" 'operations'),", f" 'operations', {hash}),")
content = content.replace(" 'design'),", f" 'design', {hash}),")
content = content.replace(" 'development'),", f" 'development', {hash}),")
content = content.replace(" 'video'),", f" 'video', {hash}),")
content = content.replace(" 'performance_marketing'),", f" 'performance_marketing', {hash}),")
content = content.replace(" 'sales');", f" 'sales', {hash});")

with open("database/seed.sql", "w") as f:
    f.write(content)
