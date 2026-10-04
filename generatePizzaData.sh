host=http://localhost:3000

# Login como admin
response=$(curl -s -X PUT $host/api/auth -d '{"email":"a@jwt.com", "password":"admin"}' -H 'Content-Type: application/json')
token=$(echo $response | jq -r '.token')

# Usuarios
curl -X POST $host/api/auth -d '{"name":"pizza diner", "email":"d@jwt.com", "password":"diner"}' -H 'Content-Type: application/json'
curl -X POST $host/api/auth -d '{"name":"pizza franchisee", "email":"f@jwt.com", "password":"franchisee"}' -H 'Content-Type: application/json'

# Menú
curl -X PUT $host/api/order/menu -H 'Content-Type: application/json' -H "Authorization: Bearer $token" -d '{"title":"Veggie", "description":"A garden of delight", "image":"pizza1.png", "price":0.0038}'
curl -X PUT $host/api/order/menu -H 'Content-Type: application/json' -H "Authorization: Bearer $token" -d '{"title":"Pepperoni", "description":"Spicy treat", "image":"pizza2.png", "price":0.0042}'
curl -X PUT $host/api/order/menu -H 'Content-Type: application/json' -H "Authorization: Bearer $token" -d '{"title":"Margarita", "description":"Essential classic", "image":"pizza3.png", "price":0.0042}'
curl -X PUT $host/api/order/menu -H 'Content-Type: application/json' -H "Authorization: Bearer $token" -d '{"title":"Crusty", "description":"A dry mouthed favorite", "image":"pizza4.png", "price":0.0028}'
curl -X PUT $host/api/order/menu -H 'Content-Type: application/json' -H "Authorization: Bearer $token" -d '{"title":"Charred Leopard", "description":"For those with a darker side", "image":"pizza5.png", "price":0.0099}'

# Franquicia y tienda
curl -X POST $host/api/franchise -H 'Content-Type: application/json' -H "Authorization: Bearer $token" -d '{"name":"pizzaPocket", "admins":[{"email":"f@jwt.com"}]}'
curl -X POST $host/api/franchise/1/store -H 'Content-Type: application/json' -H "Authorization: Bearer $token" -d '{"franchiseId":1, "name":"SLC"}'