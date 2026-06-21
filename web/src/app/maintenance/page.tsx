import Image from "next/image";

export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-center">
      <div className="max-w-lg">
        <Image
          src="/logo.png"
          alt="Streamora"
          width={80}
          height={80}
          className="mx-auto rounded-xl mb-8"
        />

        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Maintenance
          </span>
        </h1>

        <div className="w-16 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-auto mb-6" />

        <p className="text-lg text-gray-300 mb-2" id="maintenance-msg">
          Streamora est en maintenance.
        </p>
        <p className="text-sm text-gray-500">
          Nous revenons très bientôt avec du contenu encore meilleur !
        </p>

        <div className="mt-10 flex justify-center gap-3">
          <div className="h-3 w-3 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "0s" }} />
          <div className="h-3 w-3 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: "0.15s" }} />
          <div className="h-3 w-3 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "0.3s" }} />
        </div>

        <p className="mt-8 text-xs text-gray-700">
          &copy; {new Date().getFullYear()} Streamora
        </p>
      </div>
    </div>
  );
}
