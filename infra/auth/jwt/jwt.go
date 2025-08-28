package auth

import (
	"encoding/json"
    "encoding/base64"
    "crypto/hmac"
    "crypto/sha256"
    "strings"
    "errors"
    "fmt"
    "os"
)

type JWT struct {
	TokenHeader Header
    TokenClaims Claims
    TokenSignature string
}

func NewJWTFromToken (token *string) (*JWT, error) {

    res := JWT{}

    parts := strings.SplitN(*token, ".", 3)

    if len(parts) != 3 {
        return nil, IncompleteTokenError
    }

    // validating signature
    if signature := signHS256(fmt.Sprintf("%s.%s", parts[0], parts[1])); signature != parts[2] {
        
        return nil, InvalidSignatureError
    }

    headerByte, decodingHeaderErr := base64.RawURLEncoding.DecodeString(parts[0])
    claimsByte, decodingClaimsErr := base64.RawURLEncoding.DecodeString(parts[1])

    if decodingHeaderErr != nil {

        return nil, NewDecodingError("base64", parts[0])
    }

    if decodingClaimsErr != nil {
        
        return nil, NewDecodingError("base64", parts[1])
    }

    res.TokenSignature = parts[2] 
    
    if err := json.Unmarshal(headerByte, &res.TokenHeader); err != nil {

        return nil, NewDecodingError("json", headerByte)
    }
    
    if err := json.Unmarshal(claimsByte, &res.TokenClaims); err != nil {

        return nil, NewDecodingError("json", claimsByte)
    }

    return &res, nil
}

func NewJWTFromClaims (claims *Claims) (*JWT, error) {
    headerJSON, encodingHeaderError := json.Marshal(HS256Header)
    claimsJSON, encodingClaimsError := json.Marshal(*claims)
        
    if encodingHeaderError != nil {

        return nil, NewEncodingError("json", HS256Header)
    }

    if encodingClaimsError != nil {

        return nil, NewEncodingError("json", *claims)
    }


    headerBase64 := base64.RawURLEncoding.EncodeToString(headerJSON)
    claimsBase64 := base64.RawURLEncoding.EncodeToString(claimsJSON)
    
    signature := signHS256(fmt.Sprintf("%s.%s", headerBase64, claimsBase64))
    
    return &JWT{
        TokenHeader: HS256Header,
        TokenClaims: *claims,
        TokenSignature: signature,
    }, nil
}


func signHS256(msg string) string {
    h := hmac.New(sha256.New, []byte(os.Getenv("SECRET_KEY")))
    h.Write([]byte(msg))

    return base64.RawURLEncoding.EncodeToString(h.Sum(nil))
}
