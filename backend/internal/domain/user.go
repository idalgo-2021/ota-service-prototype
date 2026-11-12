package domain

import "time"

var (
	ErrUserNotFound      = NewNotFound("user not found")
	ErrUserAlreadyExists = NewConflict("user already exists")
)

type Role string

const (
	RoleAdmin    Role = "admin"
	RoleManager  Role = "manager"
	RoleUser     Role = "user"
	RoleHotelier Role = "hotelier"
	RoleAIRobot  Role = "ai_robot"
)

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Role         Role      `json:"role"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
