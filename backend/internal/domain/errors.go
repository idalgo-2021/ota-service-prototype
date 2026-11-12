package domain

import "errors"

// Interfaces for error categorization
type NotFoundError interface {
	IsNotFound() bool
}

type ConflictError interface {
	IsConflict() bool
}

// Internal implementations
type notFoundErr struct {
	error
}

func (e notFoundErr) IsNotFound() bool { return true }

// NewNotFound creates a categorized NotFound error.
func NewNotFound(msg string) error {
	return notFoundErr{errors.New(msg)}
}

type conflictErr struct {
	error
}

func (e conflictErr) IsConflict() bool { return true }

// NewConflict creates a categorized Conflict error.
func NewConflict(msg string) error {
	return conflictErr{errors.New(msg)}
}

// Sentinel errors for the domain layer.
// These allow handlers to map domain errors to correct HTTP statuses.
var (
	ErrNotFound      = NewNotFound("not found")
	ErrAlreadyExists = NewConflict("already exists")
	ErrInvalidInput  = errors.New("invalid input")
	ErrUnauthorized  = errors.New("unauthorized")
	ErrForbidden     = errors.New("forbidden")
)
