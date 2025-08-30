package auth

import (
	"errors"
	"fmt"
)

var ErrIncompleteToken = errors.New("failed to decode jwt content: incomplete token")
var ErrInvalidSignature = errors.New("token verification failed: invalid signature")
var ErrExpiredToken = errors.New("token verification failed: expired")

func NewDecodingError(format string, obj any) DecodingError {
	return DecodingError{
		Format: format,
		Obj:    obj,
	}
}

func NewEncodingError(format string, obj any) EncodingError {
	return EncodingError{
		Format: format,
		Obj:    obj,
	}
}

type DecodingError struct {
	Format string
	Obj    any
}

type EncodingError struct {
	Format string
	Obj    any
}

func (err DecodingError) Error() string {
	return fmt.Sprintf("Failed to decode %v to %s", err.Obj, err.Format)
}

func (err EncodingError) Error() string {
	return fmt.Sprintf("Failed to encode %v from %s", err.Obj, err.Format)
}
