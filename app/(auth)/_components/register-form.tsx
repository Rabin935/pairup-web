export default function RegisterForm() {
    return (
        <div>
            Login Header
            <div>
                <label htmlFor="">Email</label>
                <input className="mx-20 max-w-60 max-h-1 p-4 border rounded" type="email" />
            </div>
            <div>
                <label htmlFor="">Password</label>
                <input className="mx-13 max-w-60 max-h-1 p-4 border rounded" type="password" />
            </div>
        </div>
    );
}