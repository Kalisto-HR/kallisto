package utils

type HandlerFuncErr struct {
	msg    string
	status int
}

func (err HandlerFuncErr) Error() string {
	return err.msg
}

func (err HandlerFuncErr) Status() int {
	return err.status
}

func NewHandlerFuncErr(statusCode int, errMsg string) HandlerFuncErr {
	return HandlerFuncErr{
		msg:    errMsg,
		status: statusCode,
	}
}
