package postgres

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

func reviewClientNames(ctx context.Context, db *pgxpool.Pool, ids []string) (map[string]string, error) {
	names := make(map[string]string)
	if len(ids) == 0 {
		return names, nil
	}
	rows, err := db.Query(ctx, `SELECT u.id,COALESCE(NULLIF(trim(concat_ws(' ',p.first_name,p.last_name)),''),u.email)
		FROM users u LEFT JOIN user_profiles p ON p.user_id=u.id WHERE u.id=ANY($1::uuid[])`, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var id, name string
		if err := rows.Scan(&id, &name); err != nil {
			return nil, err
		}
		names[id] = name
	}
	return names, rows.Err()
}
