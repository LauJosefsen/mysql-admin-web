docker run --detach -p 3306:3306 --name some-mariadb --env MARIADB_ALLOW_EMPTY_ROOT_PASSWORD=1  mariadb:latest || echo "Container already running"

docker exec -it some-mariadb mariadb -e "CREATE DATABASE testdb; USE testdb; CREATE TABLE testtable2 (id INT, name VARCHAR(20)); INSERT INTO testtable2 VALUES (1, 'test1'); BEGIN; SELECT * FROM testtable WHERE id = 1 FOR UPDATE;"
