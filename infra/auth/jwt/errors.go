package auth

import (
	"fmt"
	"errors"
)

var IncompleteTokenError = errors.New("Failed to decode JWT content: incomplete token")
var InvalidSignatureError = errors.New("Token verification failed")

func NewDecodingError (format string, obj any) {
	return DecodeString{
		Format: format,
		Obj: obj, 
	}
}

func NewEncodingError (format string, obj any) {
	return EncodingError{
		Format: format,
		Obj: obj,
	}
}

struct DecodingError {
	Format string
	Obj any
}

struct EncodingError {
	Format string
	Obj any
}

func (err DecodingError) Error() string {
	return fmt.Sprintf("Failed to decode %v to %s", err.Obj, err.Format) 
}

func (err EncodingError) Error() string {
	return fmt.Sprintf("Failed to encode %v from %s", err.Obj, err.Format)
}

